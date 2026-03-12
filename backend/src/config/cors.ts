import { env } from './env.js';

const localhostPattern = /^http:\/\/(localhost|127\.0\.0\.1):(\d+)$/;

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  if (origin === env.FRONTEND_URL) {
    return true;
  }

  return localhostPattern.test(origin);
}
