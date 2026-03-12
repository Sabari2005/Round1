import { env } from './env.js';

const localhostPattern = /^http:\/\/(localhost|127\.0\.0\.1):(\d+)$/;
const vercelPattern = /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i;

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  if (origin === env.FRONTEND_URL) {
    return true;
  }

  if (localhostPattern.test(origin)) {
    return true;
  }

  return vercelPattern.test(origin);
}
