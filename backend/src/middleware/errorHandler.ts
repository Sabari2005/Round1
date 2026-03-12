import type { NextFunction, Request, Response } from 'express';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ZodError } from 'zod';

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Route not found' });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error(err);

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Invalid request payload',
      details: err.issues.map((issue) => issue.message)
    });
    return;
  }

  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'That team name is already taken' });
      return;
    }

    res.status(400).json({ error: 'Database request failed' });
    return;
  }

  if (err instanceof Error) {
    res.status(500).json({ error: err.message || 'Internal server error' });
    return;
  }

  res.status(500).json({ error: 'Internal server error' });
}
