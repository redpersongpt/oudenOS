// ─── redcore-Tuning Cloud API ───────────────────────────────────────────────
// Handles: accounts, auth, subscription licensing, device binding,
// anonymized telemetry, update metadata, crash reporting.
//
// NOT responsible for: any system tuning, benchmarking, or privileged ops.
// Those happen entirely on-device in the Rust service.

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rawBody from "fastify-raw-body";
import { authRoutes } from "./routes/auth.js";
import { usersRoutes } from "./routes/users.js";
import { subscriptionRoutes } from "./routes/subscription.js";
import { licenseRoutes } from "./routes/license.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { telemetryRoutes } from "./routes/telemetry.js";
import { updateRoutes } from "./routes/updates.js";
import { adminRoutes } from "./routes/admin.js";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    transport: process.env.NODE_ENV === "development"
      ? { target: "pino-pretty" }
      : undefined,
  },
  bodyLimit: 1 * 1024 * 1024, // 1 MB
});

async function start() {
  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false, // API-only, no HTML served
  });

  // Raw body plugin — required for Stripe webhook signature verification
  await app.register(rawBody, {
    field: "rawBody",
    global: false,
    encoding: "utf8",
    runFirst: true,
  });

  // CORS — desktop app and web billing portal
  await app.register(cors, {
    origin: [
      "https://app.redcore-tuning.com",
      "http://localhost:5173",
    ],
    credentials: true,
  });

  // Routes
  await app.register(authRoutes, { prefix: "/v1/auth" });
  await app.register(usersRoutes, { prefix: "/v1/users" });
  await app.register(subscriptionRoutes, { prefix: "/v1/subscription" });
  await app.register(licenseRoutes, { prefix: "/v1/license" });
  await app.register(webhookRoutes, { prefix: "/v1/webhooks" });
  await app.register(telemetryRoutes, { prefix: "/v1/telemetry" });
  await app.register(updateRoutes, { prefix: "/v1/updates" });
  await app.register(adminRoutes, { prefix: "/v1/admin" });

  // Health check
  app.get("/health", async () => ({ status: "ok", version: "0.1.0" }));

  const port = parseInt(process.env.PORT ?? "3001", 10);
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({ port, host });
  app.log.info(`Cloud API listening on ${host}:${port}`);
}

start().catch((err) => {
  console.error("Failed to start cloud API:", err);
  process.exit(1);
});
