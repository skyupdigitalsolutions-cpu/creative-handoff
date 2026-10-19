import { Redis } from 'ioredis';

import { env } from '../config/env.js';

import { logger } from './logger.js';

let client: Redis | undefined;

/**
 * Shared Redis client for cache and rate limiting.
 * BullMQ creates its own connections from REDIS_URL (Day 2), because blocking
 * queue commands must not share a connection with normal requests.
 */
export function getRedis(): Redis {
  if (!client) {
    client = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      // Fail fast instead of queueing commands while Redis is down; callers handle the error.
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectionName: 'chh-api',
    });
    client.on('error', (error: Error) => logger.error({ err: error }, 'Redis error'));
    client.on('ready', () => logger.info('Redis connected'));
    client.on('end', () => logger.warn('Redis connection closed'));
  }
  return client;
}

export async function connectRedis(): Promise<void> {
  const redis = getRedis();
  if (redis.status === 'wait' || redis.status === 'end') {
    await redis.connect();
  }
}

export async function disconnectRedis(): Promise<void> {
  if (client) {
    await client.quit().catch(() => client?.disconnect());
    client = undefined;
  }
}

export function isRedisReady(): boolean {
  return client?.status === 'ready';
}