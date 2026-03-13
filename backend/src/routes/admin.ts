import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { getIo } from '../config/socket.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getLeaderboard } from '../services/leaderboard.js';
import { ensureScoringConfig, recomputeQuestionScores } from '../services/scoring.js';

const questionSchema = z.object({
  title: z.string().min(2).max(120),
  prompt: z.string().min(4).max(2500),
  imageUrl: z
    .string()
    .trim()
    .max(2048)
    .optional()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || z.url().safeParse(value).success, 'Invalid image URL'),
  startingScore: z.number().int().min(1).nullable().optional(),
  reductionAmount: z.number().int().min(1).nullable().optional(),
  minimumScore: z.number().int().min(1).nullable().optional()
}).superRefine((payload, context) => {
  const rawValues = [payload.startingScore, payload.reductionAmount, payload.minimumScore];
  const definedValues = rawValues.filter((value) => value !== undefined);

  if (definedValues.length > 0 && definedValues.length < 3) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide all question scoring fields or leave all blank'
    });
    return;
  }

  if (definedValues.length === 3) {
    const values = rawValues as Array<number | null>;
    const hasAnyNull = values.some((value) => value === null);
    const hasAllNull = values.every((value) => value === null);

    if (hasAnyNull && !hasAllNull) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'To use default scoring, clear all question scoring fields'
      });
      return;
    }

    if (!hasAllNull) {
      const [startingScore, , minimumScore] = values as number[];
      if (minimumScore > startingScore) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Question minimum score cannot be greater than question starting score'
        });
      }
    }
  }
});

const submissionScoreSchema = z.object({
  isCorrect: z.boolean()
});

const scoringConfigSchema = z.object({
  startingScore: z.coerce.number().int().min(50),
  reductionAmount: z.coerce.number().int().min(1),
  minimumScore: z.coerce.number().int().min(1)
});

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole('admin'));

adminRouter.put('/question', async (req, res, next) => {
  try {
    const payload = questionSchema.parse(req.body);

    await prisma.question.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    });

    const question = await prisma.question.create({
      data: {
        title: payload.title,
        prompt: payload.prompt,
        imageUrl: payload.imageUrl,
        startingScore: payload.startingScore,
        reductionAmount: payload.reductionAmount,
        minimumScore: payload.minimumScore,
        isActive: true
      }
    });

    getIo().emit('question:update', question);
    getIo().emit('submission:update', []);

    res.json({ question, submissions: [] });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/submissions', async (_req, res, next) => {
  try {
    const active = await prisma.question.findFirst({ where: { isActive: true } });

    if (!active) {
      res.json({ submissions: [] });
      return;
    }

    const submissions = await prisma.submission.findMany({
      where: {
        questionId: active.id,
        isCorrect: null
      },
      include: {
        team: { select: { name: true } }
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    });

    res.json({ submissions });
  } catch (error) {
    next(error);
  }
});

adminRouter.delete('/teams', async (_req, res, next) => {
  try {
    const deletedTeams = await prisma.$transaction(async (tx) => {
      await tx.submission.deleteMany();
      const deleted = await tx.team.deleteMany();
      return deleted.count;
    });

    getIo().to('leaderboard').emit('leaderboard:update', []);
    getIo().emit('submission:update', []);

    res.json({ success: true, deletedTeams, submissions: [], leaderboard: [] });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/submissions/:id/score', async (req, res, next) => {
  try {
    const payload = submissionScoreSchema.parse(req.body);

    const existingSubmission = await prisma.submission.findUnique({
      where: { id: req.params.id }
    });

    if (!existingSubmission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    if (existingSubmission.isCorrect !== null) {
      const leaderboard = await getLeaderboard();
      const activeSubmissions = await prisma.submission.findMany({
        where: {
          questionId: existingSubmission.questionId,
          isCorrect: null
        },
        include: { team: { select: { name: true } } },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
      });

      res.status(409).json({
        error: 'This submission was already graded',
        submissions: activeSubmissions,
        leaderboard
      });
      return;
    }

    const submission = await prisma.submission.update({
      where: { id: req.params.id },
      data: {
        isCorrect: payload.isCorrect,
        awardedScore: payload.isCorrect ? undefined : 0,
        scoredAt: new Date()
      }
    });

    await recomputeQuestionScores(submission.questionId);

    const leaderboard = await getLeaderboard();
    getIo().to('leaderboard').emit('leaderboard:update', leaderboard);

    const activeSubmissions = await prisma.submission.findMany({
      where: {
        questionId: submission.questionId,
        isCorrect: null
      },
      include: { team: { select: { name: true } } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
    });

    getIo().emit('submission:update', activeSubmissions);

    res.json({ success: true, submissions: activeSubmissions, leaderboard });
  } catch (error) {
    next(error);
  }
});

adminRouter.get('/scoring-config', async (_req, res, next) => {
  try {
    const config = await ensureScoringConfig();
    res.json({ config });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/scoring-config', async (req, res, next) => {
  try {
    const payload = scoringConfigSchema.parse(req.body);

    if (payload.minimumScore > payload.startingScore) {
      res.status(400).json({ error: 'minimumScore cannot be greater than startingScore' });
      return;
    }

    const config = await prisma.scoringConfig.upsert({
      where: { id: 1 },
      update: payload,
      create: {
        id: 1,
        ...payload
      }
    });

    const relevantQuestionIds = await prisma.submission.findMany({
      where: { isCorrect: true },
      distinct: ['questionId'],
      select: { questionId: true }
    });

    for (const q of relevantQuestionIds) {
      await recomputeQuestionScores(q.questionId);
    }

    const leaderboard = await getLeaderboard();
    getIo().to('leaderboard').emit('leaderboard:update', leaderboard);

    res.json({ config });
  } catch (error) {
    next(error);
  }
});
