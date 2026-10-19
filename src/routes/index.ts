// File: src/routes/index.ts

import { Router } from 'express';

import { createHealthRouter, type HealthChecks } from '../modules/health/index.js';

export interface ApiRouterOptions {
  healthChecks: HealthChecks;
}

/**
 * Everything under /api/v1.
 * Later this mounts: /auth, /w/:slug/* (workspace routes), /public/*, /admin/*, /webhooks/*.
 */
export function createApiRouter(options: ApiRouterOptions): Router {
  const router = Router();
  router.use('/health', createHealthRouter(options.healthChecks));
  return router;
}
