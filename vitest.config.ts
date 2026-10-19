import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Env is validated at import time, so test values are set before any test file loads.
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/chh_test?replicaSet=rs0',
      REDIS_URL: 'redis://127.0.0.1:6379',
      APP_URL: 'http://localhost:5173',
      SWAGGER_ENABLED: 'true',
    },
    restoreMocks: true,
  },
});