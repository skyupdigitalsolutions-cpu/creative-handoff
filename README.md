# Creative Handoff Hub — Backend API

Express + TypeScript modular monolith for Creative Handoff Hub: workspaces, projects, large-file uploads
to Cloudflare R2, malware scanning, client review and approvals, UTM governance, exports, billing and
platform admin. Built from the MVP PRD and BPD v1.0 (process IDs P-01 to P-62).

Sign-in is **email OTP only**. Google sign-in is out of scope.

## Requirements

- Node.js 24 LTS (npm 11)
- MongoDB 7+ running as a **replica set** (transactions are required)
- Redis 7+
- ClamAV daemon (`clamd`) for malware scanning
- FFmpeg/ffprobe on the worker machine (video metadata and poster frames)
- An S3-compatible bucket: Cloudflare R2 in production, MinIO locally

## Getting started

```bash
cp .env.example .env      # fill in secrets
npm install
npm run dev               # API on http://localhost:4000
npm run dev:worker        # background workers (second terminal)
```

API docs: `http://localhost:4000/api/docs` (Swagger UI).

## Scripts

| Script                            | What it does                                            |
| --------------------------------- | ------------------------------------------------------- |
| `npm run dev` / `dev:worker`      | Run API / worker with reload                            |
| `npm run build`                   | Compile `src/` to `dist/`                               |
| `npm start` / `start:worker`      | Run compiled API / worker                               |
| `npm run typecheck`               | Type-check everything (src, scripts, tests)             |
| `npm run lint` / `lint:fix`       | ESLint                                                  |
| `npm run format` / `format:check` | Prettier                                                |
| `npm test` / `test:watch`         | Vitest                                                  |
| `npm run gen:openapi`             | Write `openapi.json` for the frontend's type generation |
| `npm run seed:plans`              | Seed Free, Pro and Agency plans                         |

## Folder structure

```
src/
├── server.ts            # HTTP entry
├── worker.ts            # BullMQ workers + scheduled jobs (separate process)
├── app.ts               # Express app: middleware order, routes, error handler
├── config/              # env validation, CFG service (CFG-01…CFG-86)
├── database/            # connection, transactions, plugins (tenant, revision, soft delete)
├── middleware/          # request-id, auth, tenant, permit, validate, idempotency, rate limit…
├── errors/              # AppError + HTTP helpers → { code, messageId, field, params, requestId }
├── permissions/         # BPD §3.2 permission matrix
├── shared/              # zod schemas, message IDs, enums, field formats (exported to the frontend)
├── lib/                 # storage, email, scanner, media, razorpay, turnstile, crypto, jwt, logger
├── queues/              # queue names + producers
├── workers/             # scan, media, notifications, exports, link-expiry, cleanup
├── modules/             # one folder per business area (auth, workspaces, projects, assets…)
├── routes/              # /api/v1 mounting: workspace, public, admin, webhooks
├── openapi/             # zod → OpenAPI registry, Swagger UI
├── types/               # Express request augmentation
└── utils/               # pagination, money, dates, url
tests/                   # setup, factories, tenancy (cross-workspace), integration, e2e
scripts/                 # gen-openapi, seed-plans, create-platform-admin
```

Each module follows the same pattern:

```
modules/<name>/
├── <name>.model.ts        # Mongoose schema + plugins
├── <name>.routes.ts       # permit → validate → idempotency → controller
├── <name>.controller.ts   # thin: request in, response out
├── <name>.service.ts      # business rules, transactions, audit + outbox
├── <name>.policy.ts       # record-level rules ("Member: own only")
├── <name>.mapper.ts       # model → API response
├── <name>.openapi.ts      # Swagger registration
└── index.ts               # public surface for other modules
```

## Rules

- `routes → middleware → controller → service → model`. Controllers hold no business logic.
- A module never imports another module's model; it calls that module's service (enforced by ESLint).
- Every workspace route resolves the workspace from the user's membership, never from client input.
- Business change, audit record and outbox record are written in one transaction.
- No hard-coded limits or user-facing text: use the CFG service and message IDs.
- The same Docker image runs the API (`node dist/server.js`) or the worker (`node dist/worker.js`).