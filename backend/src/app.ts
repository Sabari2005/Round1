import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { isAllowedOrigin } from './config/cors.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { adminRouter } from './routes/admin.js';
import { authRouter } from './routes/auth.js';
import { mediaRouter } from './routes/media.js';
import { userRouter } from './routes/user.js';

export const app = express();

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed: ${origin ?? 'unknown'}`));
    },
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/media', mediaRouter);
app.use('/api/user', userRouter);
app.use('/api/admin', adminRouter);

app.use(notFound);
app.use(errorHandler);
