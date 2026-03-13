import { prisma } from '../config/prisma.js';
import type { Prisma } from '@prisma/client';

export async function ensureScoringConfig() {
  const existing = await prisma.scoringConfig.findUnique({ where: { id: 1 } });

  if (existing) {
    return existing;
  }

  return prisma.scoringConfig.create({
    data: {
      id: 1,
      startingScore: 100,
      reductionAmount: 10,
      minimumScore: 50
    }
  });
}

export async function recomputeQuestionScores(questionId: string): Promise<void> {
  const config = await ensureScoringConfig();
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      startingScore: true,
      reductionAmount: true,
      minimumScore: true
    }
  });

  if (!question) {
    return;
  }

  const startingScore = question.startingScore ?? config.startingScore;
  const reductionAmount = question.reductionAmount ?? config.reductionAmount;
  const minimumScore = question.minimumScore ?? config.minimumScore;

  const submissions = await prisma.submission.findMany({
    where: {
      questionId,
      isCorrect: true
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
  });

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let scoreGroupIndex = 0;
    let previousTimestamp: number | null = null;

    for (const submission of submissions) {
      const currentTimestamp = submission.createdAt.getTime();
      if (previousTimestamp !== null && currentTimestamp !== previousTimestamp) {
        scoreGroupIndex += 1;
      }

      const score = Math.max(startingScore - scoreGroupIndex * reductionAmount, minimumScore);
      await tx.submission.update({
        where: { id: submission.id },
        data: {
          awardedScore: score,
          scoredAt: new Date()
        }
      });

      previousTimestamp = currentTimestamp;
    }

    await tx.team.updateMany({ data: { totalScore: 0 } });

    const totals = await tx.submission.groupBy({
      by: ['teamId'],
      where: {
        isCorrect: true
      },
      _sum: {
        awardedScore: true
      }
    });

    for (const row of totals) {
      await tx.team.update({
        where: { id: row.teamId },
        data: {
          totalScore: row._sum.awardedScore ?? 0
        }
      });
    }
  });
}
