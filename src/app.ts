// File: src/app.ts

import express, { type Express } from 'express';

import { env, isProduction } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { httpLogger } from './middleware/http-logger.js';
import { notFoundHandler } from './middleware/not-found.js';
import { requestId } from './middleware/request-id.js';
import { securityMiddleware } from './middleware/security.js';
import { defaultHealthChecks, type HealthChecks } from './modules/health/index.js';
import { createDocsRouter } from './openapi/swagger.js';
import { createApiRouter } from './routes/index.js';

export interface AppOptions {
  /** Override dependency checks (tests). */
  healthChecks?: HealthChecks;
}

/**
 * Builds the Express app without starting a server, so tests can call it directly.
 * Middleware order matters:
 *   request ID → request logging → API docs → security/parsing → routes → 404 → error handler
 */
export function createApp(options: AppOptions = {}): Express {
  const app = express();

  app.disable('x-powered-by');
  // Behind Nginx in production: trust exactly one proxy hop for the client IP (rate limits, audit).
  app.set('trust proxy', isProduction ? 1 : 'loopback');

  app.use(requestId);

  // Browsers ask for this automatically; answer quietly instead of logging a 404 each time.
  app.get('/favicon.ico', (_req, res) => {
    res.status(204).end();
  });

  app.use(httpLogger);

  // Root: a pointer to the useful URLs, so opening http://localhost:4000 isn't a dead end.
  app.get('/', (_req, res) => {
    res.json({
      name: 'Creative Handoff Hub API',
      health: '/api/v1/health',
      docs: env.SWAGGER_ENABLED ? '/api/docs' : null,
    });
  });

  // Swagger UI serves its own HTML/JS, so it is mounted before the strict API security headers.
  if (env.SWAGGER_ENABLED) {
    app.use('/api/docs', createDocsRouter());
  }

  app.use('/api', ...securityMiddleware());
  app.use('/api/v1', createApiRouter({ healthChecks: options.healthChecks ?? defaultHealthChecks }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}