import type { Config } from "drizzle-kit";

export default {
  // Canonical schema lives in packages/db — all migrations derive from there
  schema: "../../packages/db/src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/redcore",
  },
} satisfies Config;
