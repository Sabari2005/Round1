import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { getIo } from '../config/socket.js';
import { authenticate, requireRole, type RequestWithUser } from '../middleware/auth.js';
import { getLeaderboard } from '../services/leaderboard.js';

const submitSchema = z.object({
  answer: z.string().min(1).max(2000)
});

export const userRouter = Router();

userRouter.use(authenticate, requireRole('team'));

userRouter.get('/question', async (_req, res, next) => {
  try {
    const question = await prisma.question.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ question });
  } catch (error) {
    next(error);
  }
});

userRouter.post('/submit', async (req: RequestWithUser, res, next) => {
  try {
    const payload = submitSchema.parse(req.body);
    const teamId = req.user!.sub;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true }
    });

    if (!team) {
      res.status(401).json({ error: 'Team session is no longer valid. Please login again.' });
      return;
    }

    const question = await prisma.question.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: 'desc' }
    });

    if (!question) {
      res.status(400).json({ error: 'No active question right now' });
      return;
    }

    const existing = await prisma.submission.findUnique({
      where: {
        teamId_questionId: {
          teamId,
          questionId: question.id
        }
      }
    });

    if (existing) {
      res.status(409).json({ error: 'You already submitted for the current question' });
      return;
    }

    const submission = await prisma.submission.create({
      data: {
        answer: payload.answer,
        teamId,
        questionId: question.id,
        isCorrect: null,
        awardedScore: null
      },
      include: {
        team: {
          select: { name: true }
        }
      }
    });

    getIo().emit('submission:new', {
      id: submission.id,
      teamName: submission.team.name,
      answer: submission.answer,
      questionId: submission.questionId,
      createdAt: submission.createdAt
    });

    const leaderboard = await getLeaderboard();
    getIo().to('leaderboard').emit('leaderboard:update', leaderboard);

    res.status(201).json({ submissionId: submission.id });
  } catch (error) {
    next(error);
  }
});

userRouter.get('/leaderboard', async (_req, res, next) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json({ leaderboard });
  } catch (error) {
    next(error);
  }
});
