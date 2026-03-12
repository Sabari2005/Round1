import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { isAllowedOrigin } from './cors.js';

let io: Server;

export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin not allowed: ${origin ?? 'unknown'}`));
      },
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    socket.on('leaderboard:join', () => {
      socket.join('leaderboard');
    });

    socket.on('disconnect', () => {
      socket.leave('leaderboard');
    });
  });

  return io;
}

export function getIo(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }

  return io;
}
