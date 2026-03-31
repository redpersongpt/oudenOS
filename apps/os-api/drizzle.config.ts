import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  // Canonical schema lives in packages/db — all migrations derive from there
  schema: '../../packages/db/src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
