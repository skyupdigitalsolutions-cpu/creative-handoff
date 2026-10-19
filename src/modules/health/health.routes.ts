import { Router } from 'express';

import { createHealthController } from './health.controller.js';
import type { HealthChecks } from './health.service.js';

export function createHealthRouter(checks: HealthChecks): Router {
  const controller = createHealthController(checks);
  const router = Router();
  router.get('/', controller.ready);
  router.get('/live', controller.live);
  return router;
}
