import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { z, ZodType } from 'zod';

import type { FieldError } from '../errors/app-error.js';
import { validationFailed } from '../errors/http-errors.js';
import { isMessageId } from '../shared/messages/index.js';

/**
 * Request validation (G-01). The same zod schemas are shared with the frontend, so the
 * browser and the server never disagree. Schemas set message IDs as their error text:
 *
 *   email: z.email({ error: 'FD-02' })
 *
 * Usage in a route file:
 *
 *   router.post('/projects', validated({ body: CreateProjectBody }, async ({ body }, req, res) => {
 *     res.status(201).json(await projectService.create(req.workspace, body));
 *   }));
 */

interface RequestSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

type Parsed<S extends ZodType | undefined> = S extends ZodType ? z.output<S> : undefined;

export interface ValidatedInput<S extends RequestSchemas> {
  body: Parsed<S['body']>;
  query: Parsed<S['query']>;
  params: Parsed<S['params']>;
}

type ValidatedHandler<S extends RequestSchemas> = (
  input: ValidatedInput<S>,
  req: Request,
  res: Response,
  next: NextFunction,
) => unknown;

function toFieldErrors(location: string, issues: z.core.$ZodIssue[]): FieldError[] {
  return issues.map((issue): FieldError => {
    const path = issue.path.map(String).join('.');
    const field = location === 'body' ? path || 'body' : `${location}.${path}`.replace(/\.$/, '');
    if (isMessageId(issue.message)) return { field, messageId: issue.message };
    // Schema without a message ID: missing values get FD-07, anything else the generic banner text.
    const missing = issue.code === 'invalid_type' && issue.input === undefined;
    if (missing) return { field, messageId: 'FD-07', params: { Field: path || location } };
    return { field, messageId: 'GEN-09', params: { n: 1 } };
  });
}

export function validated<S extends RequestSchemas>(
  schemas: S,
  handler: ValidatedHandler<S>,
): RequestHandler {
  return async (req, res, next) => {
    const fieldErrors: FieldError[] = [];
    const input: Record<string, unknown> = { body: undefined, query: undefined, params: undefined };

    for (const location of ['params', 'query', 'body'] as const) {
      const schema = schemas[location];
      if (!schema) continue;
      const result = await schema.safeParseAsync(req[location]);
      if (result.success) input[location] = result.data;
      else fieldErrors.push(...toFieldErrors(location, result.error.issues));
    }

    if (fieldErrors.length > 0) throw validationFailed(fieldErrors);
    if (schemas.body) req.body = input.body;

    await handler(input as unknown as ValidatedInput<S>, req, res, next);
  };
}