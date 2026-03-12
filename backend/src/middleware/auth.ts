import type { NextFunction, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt.js';
import type { AuthPayload, UserRole } from '../types.js';

export interface RequestWithUser extends Request {
  user?: AuthPayload;
}

export function authenticate(req: RequestWithUser, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(role: UserRole) {
  return (req: RequestWithUser, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  };
}
