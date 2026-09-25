import http from 'http';
import { Server as SocketIoServer } from 'socket.io';
import { app } from './app';
import { env } from './config/env';
import { socketPublisher } from './infrastructure/realtime/socket.publisher';
import { prisma } from './infrastructure/database/prisma.client';

export const createServer = () => {
  const httpServer = http.createServer(app);

  // Setup Socket.IO on the same server, default namespace '/' and path '/socket.io'
  const io = new SocketIoServer(httpServer, {
    path: '/socket.io',
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST', 'DELETE']
    }
  });

  socketPublisher.setServer(io);

  io.on('connection', (socket) => {
    // Basic connectivity logging in development
    if (env.NODE_ENV === 'development') {
      console.log(`🔌 [Socket.IO] Client connected: ${socket.id}`);
    }

    socket.on('disconnect', () => {
      if (env.NODE_ENV === 'development') {
        console.log(`🔌 [Socket.IO] Client disconnected: ${socket.id}`);
      }
    });
  });

  return { httpServer, io };
};

if (process.env.NODE_ENV !== 'test') {
  const { httpServer } = createServer();

  const server = httpServer.listen(env.PORT, env.HOST, () => {
    console.log(`🚀 Server running on http://${env.HOST}:${env.PORT}`);
    console.log(`📚 OpenAPI Documentation available at http://localhost:${env.PORT}/docs`);
    console.log(`📄 Raw OpenAPI Spec available at http://localhost:${env.PORT}/openapi.json`);
    console.log(`⚡ Socket.IO listening on path /socket.io (default namespace /)`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.log('HTTP and Socket.IO server closed.');
      await prisma.$disconnect();
      console.log('Prisma disconnected.');
      process.exit(0);
    });

    // Force exit after 5 seconds if not closed
    setTimeout(() => {
      console.error('Force shutdown after timeout.');
      process.exit(1);
    }, 5000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
