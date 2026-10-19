// File: src/lib/logger.ts

import { pino, type LoggerOptions } from 'pino';

import { env, isDevelopment } from '../config/env.js';

/**
 * Application logger. Secrets and personal data are redacted before anything is written
 * (G-25: provider errors and secrets go to logs only, never in plain text).
 */
const options: LoggerOptions = {
  level: env.LOG_LEVEL,
  base: { service: 'chh-api', env: env.NODE_ENV },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      '*.password',
      '*.passwordHash',
      '*.otp',
      '*.otpCode',
      '*.token',
      '*.refreshToken',
      '*.accessToken',
      '*.secret',
    ],
    censor: '[redacted]',
  },
};

if (isDevelopment) {
  options.transport = {
    target: 'pino-pretty',
    options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname,service,env' },
  };
}

export const logger = pino(options);
export type Logger = typeof logger;