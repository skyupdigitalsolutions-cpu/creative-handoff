import { z } from 'zod';

/**
 * Environment variables, validated once at startup.
 * The process refuses to boot if a required value is missing or malformed.
 *
 * Values marked "later" are optional until the module that needs them lands;
 * they become required in that week (see the backend build plan).
 */

// Treat empty strings from .env files as "not set".
const optionalString = z.preprocess((v) => (v === '' ? undefined : v), z.string().min(1).optional());
const optionalUrl = z.preprocess((v) => (v === '' ? undefined : v), z.url().optional());

const booleanFlag = (defaultValue: boolean) =>
  z.preprocess(
    (v) =>
      typeof v === 'string' && v !== ''
        ? v.toLowerCase() === 'true'
        : typeof v === 'boolean'
          ? v
          : defaultValue,
    z.boolean(),
  );

const EnvSchema = z.object({
  // ---------- App ----------
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  APP_URL: z.string().min(1).default('http://localhost:5173'),
  API_URL: z.url().default('http://localhost:4000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  SWAGGER_ENABLED: booleanFlag(true),
  SUPPORT_EMAIL: z.email().default('support@creativehandoffhub.in'),

  // ---------- Database / Redis (required from Day 1) ----------
  MONGODB_URI: z.string({ error: 'MONGODB_URI is required' }).min(1, 'MONGODB_URI is required'),
  REDIS_URL: z.string({ error: 'REDIS_URL is required' }).min(1, 'REDIS_URL is required'),

  // ---------- Auth (later: Week 1 Days 3–4) ----------
  JWT_SECRET: optionalString,
  JWT_REFRESH_SECRET: optionalString,
  LINK_TOKEN_ENCRYPTION_KEY: optionalString,
  COOKIE_DOMAIN: optionalString,

  // ---------- Storage (later: Week 2) ----------
  STORAGE_ENDPOINT: optionalUrl,
  STORAGE_REGION: z.string().default('auto'),
  STORAGE_ACCESS_KEY: optionalString,
  STORAGE_SECRET_KEY: optionalString,
  STORAGE_BUCKET: optionalString,
  STORAGE_QUARANTINE_BUCKET: optionalString,

  // ---------- Malware scanning (later: Week 2) ----------
  CLAMAV_HOST: z.string().default('localhost'),
  CLAMAV_PORT: z.coerce.number().int().default(3310),

  // ---------- Email (later: Week 1 Days 3–4) ----------
  EMAIL_HOST: optionalString,
  EMAIL_PORT: z.coerce.number().int().default(587),
  EMAIL_USER: optionalString,
  EMAIL_PASSWORD: optionalString,
  EMAIL_FROM: optionalString,

  // ---------- Bot check (later: Week 2) ----------
  TURNSTILE_SECRET_KEY: optionalString,

  // ---------- Payments (later: Week 4) ----------
  RAZORPAY_KEY_ID: optionalString,
  RAZORPAY_KEY_SECRET: optionalString,
  RAZORPAY_WEBHOOK_SECRET: optionalString,

  // ---------- Monitoring ----------
  SENTRY_DSN: optionalUrl,
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map(
      (issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`,
    );
    // The logger depends on env, so write directly to stderr here.
    process.stderr.write(`\nInvalid environment configuration:\n${lines.join('\n')}\n\n`);
    process.exit(1);
  }
  return Object.freeze(parsed.data);
}

export const env: Env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDevelopment = env.NODE_ENV === 'development';

/** Allowed browser origins for CORS. APP_URL may hold a comma-separated list. */
export const allowedOrigins: string[] = env.APP_URL.split(',').map((o) => o.trim().replace(/\/$/, ''));
