import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type RequestHandler } from 'express';
import helmet from 'helmet';

import { allowedOrigins } from '../config/env.js';

/**
 * Security and parsing middleware for all /api routes (PRD §17):
 * secure headers, CORS for the web app only, cookies, and a small JSON body limit.
 *
 * File bytes never pass through the API (presigned uploads go straight to R2), so 1 MB is plenty.
 * The Razorpay webhook route mounts its own raw-body parser before this (Week 4).
 */
export function securityMiddleware(): RequestHandler[] {
  return [
    helmet({
      // JSON API: no HTML is served from these routes.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
    cors({
      origin: (origin, callback) => {
        // Requests without an Origin header (curl, server-to-server, same-origin via Nginx) are allowed.
        if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) return callback(null, true);
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id', 'Retry-After'],
      maxAge: 600,
    }),
    express.json({ limit: '1mb' }),
    cookieParser(),
  ];
}
