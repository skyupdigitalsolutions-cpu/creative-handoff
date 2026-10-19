import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Request } from 'express';
import { pinoHttp } from 'pino-http';

import { logger } from '../lib/logger.js';

/**
 * One log line per request, tagged with the request ID.
 * Health probes are not logged, to keep logs readable.
 */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req: IncomingMessage) => (req as Request).requestId,
  autoLogging: {
    ignore: (req: IncomingMessage) => req.url?.startsWith('/api/v1/health') ?? false,
  },
  customLogLevel: (_req: IncomingMessage, res: ServerResponse, error?: Error) => {
    if (error || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req: { id: unknown; method: string; url: string }) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
  },
});