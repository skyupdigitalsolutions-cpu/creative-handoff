import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

import { env } from '../config/env.js';

/**
 * OpenAPI registry (PRD §25: APIs documented with OpenAPI/Swagger).
 * Each module registers its paths in `<module>.openapi.ts`; the document is generated from
 * the same zod schemas used for validation, so docs and behaviour never drift apart.
 * The frontend generates its API types from this document (`npm run gen:openapi`).
 */
extendZodWithOpenApi(z);

export { z };

export const registry = new OpenAPIRegistry();

export const FieldErrorSchema = registry.register(
  'FieldError',
  z.object({
    field: z.string().openapi({ example: 'email' }),
    messageId: z.string().openapi({ example: 'FD-02' }),
    message: z.string().openapi({ example: 'Enter a valid email address, like name@company.com.' }),
    params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  }),
);

export const ErrorResponseSchema = registry.register(
  'ErrorResponse',
  z
    .object({
      code: z.string().openapi({ example: 'NOT_FOUND' }),
      messageId: z.string().openapi({ example: 'GEN-07' }),
      message: z.string().openapi({
        example: "This item doesn't exist, was deleted, or you no longer have access to it.",
      }),
      field: z.string().optional(),
      params: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
      fields: z.array(FieldErrorSchema).optional(),
      requestId: z.string().openapi({ example: 'req_Qm9vZ2llV29vZ2ll' }),
    })
    .openapi({ description: 'Standard error format for every failed request (G-06).' }),
);

/** Reusable error responses for path registrations. */
export const errorResponses = {
  400: { description: 'Invalid input', content: { 'application/json': { schema: ErrorResponseSchema } } },
  401: { description: 'Not signed in', content: { 'application/json': { schema: ErrorResponseSchema } } },
  403: { description: 'No permission', content: { 'application/json': { schema: ErrorResponseSchema } } },
  404: {
    description: 'Not found or not yours',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  409: {
    description: 'Conflict or wrong state',
    content: { 'application/json': { schema: ErrorResponseSchema } },
  },
  429: { description: 'Rate limited', content: { 'application/json': { schema: ErrorResponseSchema } } },
} as const;

export function buildOpenApiDocument() {
  const generator = new OpenApiGeneratorV31(registry.definitions);
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Creative Handoff Hub API',
      version: '1.0.0',
      description: 'Backend API for Creative Handoff Hub. All error responses use the ErrorResponse schema.',
    },
    servers: [{ url: `${env.API_URL}/api/v1` }],
  });
}