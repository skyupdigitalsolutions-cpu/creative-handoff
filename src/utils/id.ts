import { randomBytes } from 'node:crypto';

/**
 * Record IDs are random and never sequential (G-16), so nobody can guess
 * another workspace's IDs by counting. Format: `<prefix>_<22 url-safe chars>` (128 bits).
 *
 * Prefixes make IDs readable in logs and support tickets, e.g. `ws_…`, `prj_…`, `ast_…`.
 */
export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(16).toString('base64url')}`;
}

/** Random opaque token (link tokens, invitation tokens, reviewer cookies). Default 32 bytes. */
export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

const ID_PATTERN = /^[a-z]{2,6}_[A-Za-z0-9_-]{22}$/;

/** Cheap shape check before hitting the database with a client-supplied ID. */
export function isValidId(value: unknown, prefix?: string): value is string {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) return false;
  return prefix === undefined || value.startsWith(`${prefix}_`);
}
