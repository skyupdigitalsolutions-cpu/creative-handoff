import type { MessageId, MessageParams } from '../shared/messages/index.js';

/** One field-level problem, shown directly under that field in the UI (G-03a). */
export interface FieldError {
  field: string;
  messageId: MessageId;
  params?: MessageParams;
}

export interface AppErrorOptions {
  status: number;
  code: string;
  messageId: MessageId;
  params?: MessageParams | undefined;
  /** Single field the error belongs to. */
  field?: string | undefined;
  /** Several field errors at once (G-07). */
  fields?: FieldError[] | undefined;
  /** Original error, kept for logs only and never sent to the client. */
  cause?: unknown;
}

/**
 * The only error type services should throw for expected failures.
 * The error handler turns it into { code, messageId, message, field, params, fields, requestId } (G-06).
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly messageId: MessageId;
  readonly params: MessageParams | undefined;
  readonly field: string | undefined;
  readonly fields: FieldError[] | undefined;

  constructor(options: AppErrorOptions) {
    super(`${options.code} (${options.messageId})`, { cause: options.cause });
    this.name = 'AppError';
    this.status = options.status;
    this.code = options.code;
    this.messageId = options.messageId;
    this.params = options.params;
    this.field = options.field;
    this.fields = options.fields;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
