import type { RequestHandler } from 'express';

import { newToken } from '../utils/id.js';

const HEADER = 'x-request-id';
const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * Gives every request an ID (`req.requestId`) and returns it in the X-Request-Id header.
 * An ID sent by Nginx or the frontend is reused only if it is short and safe to log.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get(HEADER);
  req.requestId = incoming && SAFE_ID.test(incoming) ? incoming : `req_${newToken(12)}`;
  res.setHeader('X-Request-Id', req.requestId);
  next();
};
