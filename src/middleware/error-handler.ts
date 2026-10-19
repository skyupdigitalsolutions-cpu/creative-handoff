// File: src/middleware/error-handler.ts

import type { ErrorRequestHandler } from 'express';
import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { AppError, isAppError } from '../errors/app-error.js';
import { logger } from '../lib/logger.js';
import { formatMessage, type MessageParams } from '../shared/messages/index.js';

/**
 * Error response format (G-06), used for every failure:
 *
 *   { code, messageId, message, field?, params?, fields?, requestId }
 *
 * The UI shows the text for `messageId` filled with `params` (`message` is the same text,
 * pre-filled for convenience). Stack traces, provider errors and secrets never reach the
 * client (G-25); they go to the logs with the request ID.
 */

interface BodyParserError extends Error {
  type?: string;
  status?: number;
}

function translate(error: unknown): AppError {
  if (isAppError(error)) return error;

  const parserError = error as BodyParserError;
  if (parserError.type === 'entity.parse.failed') {
    return new AppError({
      status: 400,
      code: 'INVALID_JSON',
      messageId: 'GEN-09',
      params: { n: 1 },
      cause: error,
    });
  }
  if (parserError.type === 'entity.too.large') {
    return new AppError({ status: 413, code: 'PAYLOAD_TOO_LARGE', messageId: 'GEN-99', cause: error });
  }

  // A malformed ID can never match a record: treat it as "not found" (G-13).
  if (error instanceof mongoose.Error.CastError) {
    return new AppError({ status: 404, code: 'NOT_FOUND', messageId: 'GEN-07', cause: error });
  }

  // Unique index hit by a race between two requests. Services check names first (FD-28),
  // so reaching this means a simultaneous duplicate: ask the user to try again.
  if ((error as { code?: number }).code === 11000) {
    return new AppError({ status: 409, code: 'DUPLICATE_RECORD', messageId: 'GEN-01', cause: error });
  }

  return new AppError({ status: 500, code: 'INTERNAL_ERROR', messageId: 'GEN-99', cause: error });
}

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const appError = translate(error);
  const requestId = req.requestId ?? 'unknown';

  let params: MessageParams | undefined = appError.params;
  if (appError.messageId === 'GEN-99' || appError.messageId === 'GEN-12') {
    params = { ...params, supportEmail: env.SUPPORT_EMAIL, requestId };
  }

  const logContext = {
    requestId,
    code: appError.code,
    status: appError.status,
    err: appError.cause ?? appError,
  };
  if (appError.status >= 500) logger.error(logContext, 'Request failed');
  else logger.debug(logContext, 'Request rejected');

  if (appError.status === 429 && appError.params?.retryAfterSec !== undefined) {
    res.setHeader('Retry-After', String(appError.params.retryAfterSec));
  }

  res.status(appError.status).json({
    code: appError.code,
    messageId: appError.messageId,
    message: formatMessage(appError.messageId, params),
    ...(appError.field ? { field: appError.field } : {}),
    ...(params ? { params } : {}),
    ...(appError.fields
      ? {
          fields: appError.fields.map((f) => ({
            ...f,
            message: formatMessage(f.messageId, f.params),
          })),
        }
      : {}),
    requestId,
  });
};