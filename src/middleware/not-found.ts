import type { RequestHandler } from 'express';

import { notFound } from '../errors/http-errors.js';

/** Any /api route that doesn't exist: 404 in the standard error format. */
export const notFoundHandler: RequestHandler = () => {
  throw notFound('ROUTE_NOT_FOUND');
};