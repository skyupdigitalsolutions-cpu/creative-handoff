import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';

import { buildOpenApiDocument } from './registry.js';

/**
 * Swagger UI at /api/docs and the raw document at /api/docs/openapi.json.
 * Built once, after every module has registered its paths.
 */
export function createDocsRouter(): Router {
  const document = buildOpenApiDocument();
  const router = Router();
  router.get('/openapi.json', (_req, res) => {
    res.json(document);
  });
  router.use(
    '/',
    swaggerUi.serve,
    swaggerUi.setup(document, { customSiteTitle: 'Creative Handoff Hub API' }),
  );
  return router;
}
