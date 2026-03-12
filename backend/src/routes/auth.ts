import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma.js';
import { authenticate, type RequestWithUser } from '../middleware/auth.js';
import { signToken } from '../utils/jwt.js';

const teamRegisterSchema = z.object({
  name: z.string().min(2).max(40),
  password: z.string().min(6)
});

const teamLoginSchema = z.object({
  name: z.string().min(2),
  password: z.string().min(6)
});

const adminLoginSchema = z.object({
  username: z.string().min(2),
  password: z.string().min(6)
});

export const authRouter = Router();

authRouter.post('/team/register', async (req, res, next) => {
  try {
    const payload = teamRegisterSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(payload.password, 10);

    const team = await prisma.team.create({
      data: {
        name: payload.name,
        passwordHash
      }
    });

    const token = signToken({
      sub: team.id,
      role: 'team',
      name: team.name
    });

    res.status(201).json({ token, team: { id: team.id, name: team.name } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/team/login', async (req, res, next) => {
  try {
    const payload = teamLoginSchema.parse(req.body);
    const team = await prisma.team.findUnique({ where: { name: payload.name } });

    if (!team) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(payload.password, team.passwordHash);

    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken({
      sub: team.id,
      role: 'team',
      name: team.name
    });

    res.json({ token, team: { id: team.id, name: team.name } });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/admin/login', async (req, res, next) => {
  try {
    const payload = adminLoginSchema.parse(req.body);
    const admin = await prisma.admin.findUnique({ where: { username: payload.username } });

    if (!admin) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(payload.password, admin.passwordHash);

    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken({
      sub: admin.id,
      role: 'admin',
      name: admin.username
    });

    res.json({ token, admin: { id: admin.id, username: admin.username } });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', authenticate, async (req: RequestWithUser, res) => {
  res.json({ user: req.user });
});
