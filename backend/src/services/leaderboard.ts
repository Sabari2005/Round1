import { prisma } from '../config/prisma.js';

export async function getLeaderboard() {
  return prisma.team.findMany({
    select: {
      id: true,
      name: true,
      totalScore: true
    },
    orderBy: [
      { totalScore: 'desc' },
      { createdAt: 'asc' }
    ]
  });
}
