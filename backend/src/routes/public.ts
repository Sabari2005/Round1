import { Router } from 'express';
import { getLeaderboard } from '../services/leaderboard.js';

export const publicRouter = Router();

publicRouter.get('/leaderboard', async (_req, res, next) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json({ leaderboard });
  } catch (error) {
    next(error);
  }
});
