import { createServer } from 'http';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { initSocket } from './config/socket.js';
import { app } from './app.js';
import { ensureScoringConfig } from './services/scoring.js';

async function bootstrap(): Promise<void> {
  await prisma.$connect();
  await ensureScoringConfig();

  const server = createServer(app);
  initSocket(server);

  server.on('error', async (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${env.PORT} is already in use. Stop the existing backend process or change PORT in backend/.env.`);
    } else {
      console.error('Server failed to start', error);
    }

    await prisma.$disconnect();
    process.exit(1);
  });

  server.listen(env.PORT, () => {
    console.log(`Backend listening on http://localhost:${env.PORT}`);
  });
}

bootstrap().catch(async (error) => {
  console.error('Failed to start server', error);
  await prisma.$disconnect();
  process.exit(1);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
