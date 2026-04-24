import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (token) {
        const decoded = jwt.verify(token, env.jwtSecret);
        socket.user = { id: decoded.sub, organizationId: decoded.org };
      }
      next();
    } catch (err) {
      next(new Error('Unauthorized socket'));
    }
  });

  io.on('connection', (socket) => {
    logger.info('socket connected', { id: socket.id, userId: socket.user?.id });

    if (socket.user?.organizationId) {
      socket.join(`org:${socket.user.organizationId}`);
    }

    socket.on('subscribe:bus', (busId) => {
      if (typeof busId === 'string') socket.join(`bus:${busId}`);
    });
    socket.on('unsubscribe:bus', (busId) => {
      if (typeof busId === 'string') socket.leave(`bus:${busId}`);
    });

    socket.on('disconnect', () => {
      logger.info('socket disconnected', { id: socket.id });
    });
  });

  return io;
};

export const getIO = () => io;
