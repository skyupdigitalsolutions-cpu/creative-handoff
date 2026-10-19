import mongoose from 'mongoose';

import { env, isProduction } from '../config/env.js';
import { logger } from '../lib/logger.js';

mongoose.set('strictQuery', true);
// Never silently create indexes in production; they are built deliberately (PRD §12).
mongoose.set('autoIndex', !isProduction);

/**
 * Connects to MongoDB and checks it is a replica set.
 * Transactions (G-24, BR-36.4 and many more) only work on a replica set, so a standalone
 * server is refused at startup instead of failing later in the middle of a decision.
 */
export async function connectDatabase(): Promise<void> {
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  mongoose.connection.on('error', (error: Error) => logger.error({ err: error }, 'MongoDB error'));

  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10_000,
    maxPoolSize: 20,
    retryWrites: true,
  });

  const db = mongoose.connection.db;
  if (!db) throw new Error('MongoDB connected without a database handle');

  const hello = (await db.admin().command({ hello: 1 })) as { setName?: string; msg?: string };
  const isReplicaSet = typeof hello.setName === 'string' || hello.msg === 'isdbgrid';
  if (!isReplicaSet) {
    throw new Error(
      'MongoDB is running as a standalone server. Transactions need a replica set: ' +
        'start it with --replSet (see docker-compose.yml) or use MongoDB Atlas.',
    );
  }

  logger.info({ db: db.databaseName, replicaSet: hello.setName ?? 'sharded' }, 'MongoDB connected');
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}

export function isDatabaseReady(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}

/** Round-trip ping used by the health check. */
export async function pingDatabase(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db || !isDatabaseReady()) throw new Error('MongoDB not connected');
  await db.admin().ping();
}