// File: tests/foundation.test.ts

import express from 'express';
import mongoose, { Schema } from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createApp } from '../src/app.js';
import { idField } from '../src/database/schema.js';
import { TenantFilterMissingError, tenantPlugin } from '../src/database/plugins/tenant.plugin.js';
import { conflict } from '../src/errors/http-errors.js';
import { errorHandler } from '../src/middleware/error-handler.js';
import { requestId } from '../src/middleware/request-id.js';
import { validated } from '../src/middleware/validate.js';
import { formatMessage } from '../src/shared/messages/index.js';
import { isValidId, newId } from '../src/utils/id.js';

const up = () => Promise.resolve(true);
const down = () => Promise.resolve(false);

/** Minimal app with our request-id + error handler around a test route. */
function harness(register: (app: express.Express) => void) {
  const app = express();
  app.use(requestId, express.json());
  register(app);
  app.use(errorHandler);
  return app;
}

describe('health', () => {
  it('returns 200 when every dependency is up', async () => {
    const res = await request(createApp({ healthChecks: { mongo: up, redis: up } })).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', checks: { mongo: 'up', redis: 'up' } });
  });

  it('returns 503 when a dependency is down', async () => {
    const res = await request(createApp({ healthChecks: { mongo: up, redis: down } })).get('/api/v1/health');
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', checks: { redis: 'down' } });
  });

  it('liveness always answers', async () => {
    const res = await request(createApp({ healthChecks: {} })).get('/api/v1/health/live');
    expect(res.status).toBe(200);
  });
});

describe('request id', () => {
  it('generates one and returns it in the header', async () => {
    const res = await request(createApp({ healthChecks: {} })).get('/api/v1/health/live');
    expect(res.headers['x-request-id']).toMatch(/^req_/);
  });

  it('reuses a safe incoming id', async () => {
    const res = await request(createApp({ healthChecks: {} }))
      .get('/api/v1/health/live')
      .set('X-Request-Id', 'nginx-abc12345');
    expect(res.headers['x-request-id']).toBe('nginx-abc12345');
  });

  it('replaces an unsafe incoming id', async () => {
    const res = await request(createApp({ healthChecks: {} }))
      .get('/api/v1/health/live')
      .set('X-Request-Id', 'bad id <script>');
    expect(res.headers['x-request-id']).toMatch(/^req_/);
  });
});

describe('error format (G-06)', () => {
  it('unknown route → 404 GEN-07 with requestId', async () => {
    const res = await request(createApp({ healthChecks: {} })).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'ROUTE_NOT_FOUND', messageId: 'GEN-07' });
    expect(res.body.requestId).toBe(res.headers['x-request-id']);
  });

  it('invalid JSON → 400', async () => {
    const res = await request(createApp({ healthChecks: {} }))
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_JSON');
  });

  it('AppError keeps its status, code and message', async () => {
    const app = harness((a) =>
      a.get('/x', () => {
        throw conflict('LINK_REVOKED', 'GEN-07');
      }),
    );
    const res = await request(app).get('/x');
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'LINK_REVOKED', messageId: 'GEN-07' });
  });

  it('unexpected errors → 500 GEN-99 without leaking internals', async () => {
    const app = harness((a) =>
      a.get('/x', () => {
        throw new Error('database password is hunter2');
      }),
    );
    const res = await request(app).get('/x');
    expect(res.status).toBe(500);
    expect(res.body.messageId).toBe('GEN-99');
    expect(res.body.params.requestId).toBe(res.body.requestId);
    expect(JSON.stringify(res.body)).not.toContain('hunter2');
  });
});

describe('validation (G-01, G-07)', () => {
  const Body = z.object({
    email: z.email({ error: 'FD-02' }),
    name: z.string({ error: 'FD-04' }).min(2, { error: 'FD-05' }),
  });

  const app = harness((a) =>
    a.post(
      '/x',
      validated({ body: Body }, ({ body }, _req, res) => {
        res.json({ ok: true, email: body.email });
      }),
    ),
  );

  it('rejects with one message per field and the GEN-09 banner', async () => {
    const res = await request(app).post('/x').send({ email: 'asha@brand', name: 'A' });
    expect(res.status).toBe(400);
    expect(res.body.messageId).toBe('GEN-09');
    expect(res.body.params.n).toBe(2);
    expect(res.body.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'email', messageId: 'FD-02' }),
        expect.objectContaining({ field: 'name', messageId: 'FD-05' }),
      ]),
    );
  });

  it('passes parsed input to the handler', async () => {
    const res = await request(app).post('/x').send({ email: 'asha@brand.in', name: 'Asha' });
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('asha@brand.in');
  });
});

describe('messages', () => {
  it('fills placeholders', () => {
    expect(formatMessage('GEN-04', { wait: '15 minutes' })).toBe(
      'Too many attempts. Please wait 15 minutes and try again.',
    );
  });
});

describe('ids (G-16)', () => {
  it('are prefixed, random and validated', () => {
    const a = newId('prj');
    const b = newId('prj');
    expect(a).not.toBe(b);
    expect(isValidId(a, 'prj')).toBe(true);
    expect(isValidId(a, 'ws')).toBe(false);
    expect(isValidId('prj_123')).toBe(false);
  });
});

describe('tenant plugin (G-16)', () => {
  const schema = new Schema({ _id: idField('tst'), name: String }, { bufferCommands: false });
  schema.plugin(tenantPlugin);
  const TestModel = mongoose.model('TenantTest', schema);

  it('refuses a query without workspaceId', async () => {
    await expect(TestModel.find({ name: 'x' }).exec()).rejects.toBeInstanceOf(TenantFilterMissingError);
    await expect(TestModel.updateOne({}, { name: 'y' }).exec()).rejects.toBeInstanceOf(
      TenantFilterMissingError,
    );
  });

  it('refuses an aggregate that does not start with a workspaceId $match', async () => {
    await expect(TestModel.aggregate([{ $match: { name: 'x' } }]).exec()).rejects.toBeInstanceOf(
      TenantFilterMissingError,
    );
  });

  it('allows a query with workspaceId (fails later only because no DB is connected)', async () => {
    await expect(TestModel.find({ workspaceId: 'ws_1' }).exec()).rejects.not.toBeInstanceOf(
      TenantFilterMissingError,
    );
  });

  it('allows an explicit platform opt-out', async () => {
    await expect(TestModel.find({}).setOptions({ skipTenantCheck: true }).exec()).rejects.not.toBeInstanceOf(
      TenantFilterMissingError,
    );
  });
});

describe('root', () => {
  it('points to health and docs', async () => {
    const res = await request(createApp({ healthChecks: {} })).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ health: '/api/v1/health', docs: '/api/docs' });
  });

  it('answers favicon requests with 204', async () => {
    const res = await request(createApp({ healthChecks: {} })).get('/favicon.ico');
    expect(res.status).toBe(204);
  });
});