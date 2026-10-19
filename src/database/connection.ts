// File: src/database/connection.ts

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

  try {
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10_000,
      maxPoolSize: 20,
      retryWrites: true,
    });
  } catch (error) {
    throw new Error(explainConnectionError(error), { cause: error });
  }

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

/** Turns the driver's server-selection errors into an actionable message. */
function explainConnectionError(error: unknown): string {
  const reasonType = (error as { reason?: { type?: string } }).reason?.type;
  const message = error instanceof Error ? error.message : String(error);

  if (reasonType === 'ReplicaSetNoPrimary' || /ECONNREFUSED|Server selection timed out/i.test(message)) {
    return (
      `Cannot reach a MongoDB replica-set primary at ${redactUri(env.MONGODB_URI)}. Check, in order: ` +
      '(1) the database is running: `docker compose ps` shows mongo as healthy; ' +
      '(2) the replica set is initiated (the Docker healthcheck does this on first start); ' +
      '(3) no other MongoDB, such as a local Windows service, is using the same port; ' +
      '(4) for Atlas: the connection string and your IP allow-list.'
    );
  }
  return `MongoDB connection failed: ${message}`;
}

/** Hides the password in a connection string before it is logged. */
function redactUri(uri: string): string {
  return uri.replace(/\/\/([^:/@]+):([^@]+)@/, '//$1:***@');
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
