// File: src/modules/health/index.ts

import './health.openapi.js';

export { createHealthRouter } from './health.routes.js';
export { defaultHealthChecks, type HealthCheck, type HealthChecks } from './health.service.js';
