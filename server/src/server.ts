import http from 'http';
import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initSocket } from './socket';

const startServer = async () => {
  try {
    await connectDB();

    const httpServer = http.createServer(app);
    initSocket(httpServer);

    const server = httpServer.listen(env.PORT, () => {
      logger.info(`=================================`);
      logger.info(`🚀 CAREER FOR ME API Server`);
      logger.info(`Environment: ${env.NODE_ENV}`);
      logger.info(`Port: ${env.PORT}`);
      logger.info(`URL: http://localhost:${env.PORT}/api/v1/health`);
      logger.info(`AI Mock Mode: ${env.AI_MOCK_MODE}`);
      logger.info(`=================================`);
    });

    const handleShutdown = (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
