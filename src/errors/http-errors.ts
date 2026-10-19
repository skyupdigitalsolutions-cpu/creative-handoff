import type { MessageId, MessageParams } from '../shared/messages/index.js';

import { AppError, type FieldError } from './app-error.js';

/**
 * Helpers that map each failure cause to its HTTP status (G-06):
 * 400 bad input · 401 not signed in · 403 no permission · 404 not found or not yours ·
 * 409 conflict or wrong state · 413 too large · 422 business rule · 429 rate limit · 5xx server.
 */

interface Extra {
  params?: MessageParams;
  field?: string;
  cause?: unknown;
}

export const badRequest = (code: string, messageId: MessageId, extra: Extra = {}) =>
  new AppError({ status: 400, code, messageId, ...extra });

/** Several invalid fields: banner GEN-09 plus one message per field (G-07). */
export const validationFailed = (fields: FieldError[]) =>
  new AppError({
    status: 400,
    code: 'VALIDATION_FAILED',
    messageId: 'GEN-09',
    params: { n: fields.length },
    fields,
  });

export const unauthorized = (code = 'UNAUTHENTICATED') =>
  new AppError({ status: 401, code, messageId: 'GEN-08' });

export const forbidden = (code = 'FORBIDDEN') => new AppError({ status: 403, code, messageId: 'GEN-03' });

/**
 * Use for missing records AND records that belong to another workspace.
 * Never return 403 for another tenant's record: that would confirm it exists (G-13).
 */
export const notFound = (code = 'NOT_FOUND') => new AppError({ status: 404, code, messageId: 'GEN-07' });

export const conflict = (code: string, messageId: MessageId, extra: Extra = {}) =>
  new AppError({ status: 409, code, messageId, ...extra });

/** Edit conflict on a record's rev (G-10). */
export const revisionConflict = (params: { name: string; time: string }) =>
  new AppError({ status: 409, code: 'REVISION_CONFLICT', messageId: 'GEN-05', params });

export const payloadTooLarge = (code: string, messageId: MessageId, extra: Extra = {}) =>
  new AppError({ status: 413, code, messageId, ...extra });

export const unprocessable = (code: string, messageId: MessageId, extra: Extra = {}) =>
  new AppError({ status: 422, code, messageId, ...extra });

export const tooManyRequests = (wait: string) =>
  new AppError({ status: 429, code: 'RATE_LIMITED', messageId: 'GEN-04', params: { wait } });

export const serviceUnavailable = (code = 'SERVICE_UNAVAILABLE', cause?: unknown) =>
  new AppError({ status: 503, code, messageId: 'GEN-01', cause });