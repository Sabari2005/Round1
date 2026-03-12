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

  const submissions = await prisma.submission.findMany({
    where: {
      questionId,
      isCorrect: true
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }]
  });

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    for (const [index, submission] of submissions.entries()) {
      const score = Math.max(config.startingScore - index * config.reductionAmount, config.minimumScore);
      await tx.submission.update({
        where: { id: submission.id },
        data: {
          awardedScore: score,
          scoredAt: new Date()
        }
      });
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
