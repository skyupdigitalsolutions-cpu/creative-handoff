import { registry, z } from '../../openapi/registry.js';

const HealthReportSchema = registry.register(
  'HealthReport',
  z.object({
    status: z.enum(['ok', 'degraded']),
    checks: z.record(z.string(), z.enum(['up', 'down'])).openapi({ example: { mongo: 'up', redis: 'up' } }),
    version: z.string().openapi({ example: '0.1.0' }),
    uptimeSec: z.number().int(),
    time: z.string().openapi({ format: 'date-time' }),
  }),
);

registry.registerPath({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Readiness: checks MongoDB and Redis',
  responses: {
    200: {
      description: 'All dependencies are up',
      content: { 'application/json': { schema: HealthReportSchema } },
    },
    503: {
      description: 'At least one dependency is down',
      content: { 'application/json': { schema: HealthReportSchema } },
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/health/live',
  tags: ['Health'],
  summary: 'Liveness: the process is running',
  responses: {
    200: {
      description: 'Process is alive',
      content: { 'application/json': { schema: z.object({ status: z.literal('ok') }) } },
    },
  },
});
