import type { RequestHandler } from 'express';

import { getHealthReport, type HealthChecks } from './health.service.js';

export function createHealthController(checks: HealthChecks) {
  /** Liveness: the process is running. Used by the container orchestrator to restart a hung process. */
  const live: RequestHandler = (_req, res) => {
    res.json({ status: 'ok' });
  };

  /** Readiness: MongoDB and Redis answer. Load balancers route traffic only when this is 200. */
  const ready: RequestHandler = async (_req, res) => {
    const report = await getHealthReport(checks);
    res.status(report.status === 'ok' ? 200 : 503).json(report);
  };

  return { live, ready };
}