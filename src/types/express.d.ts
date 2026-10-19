/**
 * Extra properties our middleware puts on every Express request.
 * More are added as modules land (user, workspace, role, reviewer…).
 */
declare global {
  namespace Express {
    interface Request {
      /** Unique ID for this request, also returned in the X-Request-Id header and every error (G-05). */
      requestId: string;
    }
  }
}

export {};
