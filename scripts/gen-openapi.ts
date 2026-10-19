import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Importing the app registers every module's OpenAPI paths.
import '../src/app.js';
import { buildOpenApiDocument } from '../src/openapi/registry.js';

/**
 * Writes openapi.json at the repo root. The frontend runs openapi-typescript against it
 * to get typed API calls. Run after changing any route or schema: npm run gen:openapi
 */
const outFile = resolve(process.cwd(), 'openapi.json');
writeFileSync(outFile, `${JSON.stringify(buildOpenApiDocument(), null, 2)}\n`);
console.log(`OpenAPI document written to ${outFile}`);