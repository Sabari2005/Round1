import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(12, 'JWT_SECRET must be at least 12 chars'),
  FRONTEND_URL: z.string().default('http://localhost:5173')
});

export const env = envSchema.parse(process.env);
