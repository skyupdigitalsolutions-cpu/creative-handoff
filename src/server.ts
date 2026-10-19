import type { Server } from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './database/connection.js';
import { logger } from './lib/logger.js';
import { connectRedis, disconnectRedis } from './lib/redis.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

async function start(): Promise<Server> {
  await connectDatabase();
  await connectRedis();

  const app = createApp();
  return await new Promise<Server>((resolve, reject) => {
    const server = app.listen(env.PORT, (error?: Error) => {
      if (error) {
        reject(error);
        return;
      }
      logger.info(
        { port: env.PORT, docs: env.SWAGGER_ENABLED ? `${env.API_URL}/api/docs` : 'disabled' },
        'API listening',
      );
      resolve(server);
    });
  });
}

function registerShutdown(server: Server): void {
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');

    const force = setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    force.unref();

    // Stop accepting new requests, let in-flight ones finish, then close connections.
    server.close(() => {
      void Promise.allSettled([disconnectRedis(), disconnectDatabase()]).then(() => {
        logger.info('Shutdown complete');
        process.exit(0);
      });
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});

start()
  .then(registerShutdown)
  .catch((error: unknown) => {
    logger.fatal({ err: error }, 'API failed to start');
    process.exit(1);
  });