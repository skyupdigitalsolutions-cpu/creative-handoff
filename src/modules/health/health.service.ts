import { readFileSync } from 'node:fs';

import { pingDatabase } from '../../database/connection.js';
import { getRedis } from '../../lib/redis.js';

/** A dependency check: resolves true when the dependency answers in time. */
export type HealthCheck = () => Promise<boolean>;
export type HealthChecks = Record<string, HealthCheck>;

export interface HealthReport {
  status: 'ok' | 'degraded';
  checks: Record<string, 'up' | 'down'>;
  version: string;
  uptimeSec: number;
  time: string;
}

const CHECK_TIMEOUT_MS = 2_000;

const version: string = (() => {
  try {
    // Same relative path from src/modules/health and dist/modules/health.
    const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
})();

export const defaultHealthChecks: HealthChecks = {
  mongo: async () => {
    await pingDatabase();
    return true;
  },
  redis: async () => (await getRedis().ping()) === 'PONG',
};

function withTimeout(check: HealthCheck): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), CHECK_TIMEOUT_MS);
    check()
      .then((ok) => resolve(ok))
      .catch(() => resolve(false))
      .finally(() => clearTimeout(timer));
  });
}

export async function getHealthReport(checks: HealthChecks): Promise<HealthReport> {
  const names = Object.keys(checks);
  const results = await Promise.all(names.map((name) => withTimeout(checks[name] as HealthCheck)));
  const report: HealthReport['checks'] = {};
  names.forEach((name, i) => {
    report[name] = results[i] ? 'up' : 'down';
  });
  return {
    status: results.every(Boolean) ? 'ok' : 'degraded',
    checks: report,
    version,
    uptimeSec: Math.round(process.uptime()),
    time: new Date().toISOString(),
  };
}
