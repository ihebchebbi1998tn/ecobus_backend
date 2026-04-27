import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let io;

const attachUser = (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (token) {
      const decoded = jwt.verify(token, env.jwtSecret);
      socket.user = { id: decoded.sub, organizationId: decoded.org };
    }
    next();
  } catch {
    next(new Error('Unauthorized socket'));
  }
};

/**
 * Optional Redis adapter — enables horizontal scaling.
 * Set REDIS_URL=redis://host:6379 to fan out events across PM2 cluster
 * workers or multiple API nodes. Without it, single-process mode is used
 * (still fine for thousands of concurrent sockets).
 */
const tryAttachRedisAdapter = async (server) => {
  if (!process.env.REDIS_URL) return;
  try {
    const [{ createClient }, { createAdapter }] = await Promise.all([
      import('redis'),
      import('@socket.io/redis-adapter'),
    ]);
    const pub = createClient({ url: process.env.REDIS_URL });
    const sub = pub.duplicate();
    await Promise.all([pub.connect(), sub.connect()]);
    server.adapter(createAdapter(pub, sub));
    logger.info('Socket.IO Redis adapter attached');
  } catch (err) {
    logger.warn('Redis adapter unavailable — running single-node', { err: err.message });
  }
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: env.corsOrigin, credentials: true },
    // Tuned for many idle parent sockets: cheaper keepalive, larger window.
    pingInterval: 25_000,
    pingTimeout: 60_000,
    maxHttpBufferSize: 1e6,
  });
  tryAttachRedisAdapter(io).catch(() => {});

  // Default namespace kept for backward compatibility with existing clients.
  io.use(attachUser);
  io.on('connection', (socket) => {
    if (socket.user?.organizationId) socket.join(`org:${socket.user.organizationId}`);
    socket.on('subscribe:bus', (id) => typeof id === 'string' && socket.join(`bus:${id}`));
    socket.on('unsubscribe:bus', (id) => typeof id === 'string' && socket.leave(`bus:${id}`));
  });

  // Spec-compliant /ws namespace with bus:* and trip:* subscriptions.
  const ns = io.of('/ws');
  ns.use(attachUser);
  ns.on('connection', (socket) => {
    logger.info('ws connected', { id: socket.id, userId: socket.user?.id });
    if (socket.user?.organizationId) socket.join(`org:${socket.user.organizationId}`);
    if (socket.user?.id) socket.join(`user:${socket.user.id}`);

    socket.on('subscribe', (room) => {
      if (typeof room !== 'string') return;
      if (/^(bus|trip):[\w-]+$/.test(room)) socket.join(room);
    });
    socket.on('unsubscribe', (room) => {
      if (typeof room === 'string') socket.leave(room);
    });
    socket.on('disconnect', () => logger.info('ws disconnected', { id: socket.id }));
  });

  return io;
};

export const getIO = () => io;
