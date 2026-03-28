// ─── redcore-Tuning Cloud API ──────────────────────────────────────────────────
// Responsibilities:
//   accounts · auth · subscriptions · licensing · device binding
//   anonymized telemetry · update metadata
//
// NOT responsible for:
//   system tuning · benchmarking · privileged ops (all on-device in Rust service)

import Fastify from "fastify";
import cors from "@fastify/cors";
import rawBody from "fastify-raw-body";

import { authRoutes } from "./routes/auth.js";
import { usersRoutes } from "./routes/users.js";
import { subscriptionRoutes } from "./routes/subscription.js";
import { licenseRoutes } from "./routes/license.js";
import { webhookRoutes } from "./routes/webhooks.js";
import { telemetryRoutes } from "./routes/telemetry.js";
import { updateRoutes } from "./routes/updates.js";
import { adminRoutes } from "./routes/admin.js";

// ─── Server setup ─────────────────────────────────────────────────────────────

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    transport:
      process.env.NODE_ENV === "development"
        ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } }
        : undefined,
  },
  // Trust X-Forwarded-For from a single hop (nginx/Caddy reverse proxy)
  trustProxy: 1,
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  // ── Validate required env vars at startup ──────────────────────────────
  const required = ["JWT_SECRET", "DATABASE_URL"] as const;
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  // ── Plugins ───────────────────────────────────────────────────────────────

  // Raw body — must be registered before any routes that need it (Stripe webhooks)
  await app.register(rawBody, {
    field: "rawBody",
    global: false,       // opt-in per route via { config: { rawBody: true } }
    encoding: "utf8",
    runFirst: true,
  });

  // CORS — allow desktop app origin and web billing portal
  const originsEnv = process.env.CORS_ORIGINS ?? "";
  const allowedOrigins = originsEnv
    ? originsEnv.split(",").map((o) => o.trim()).filter(Boolean)
    : ["https://app.redcore-tuning.com", "http://localhost:5173"];

  await app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  });

  // ── Routes ────────────────────────────────────────────────────────────────

  await app.register(authRoutes,         { prefix: "/v1/auth" });
  await app.register(usersRoutes,        { prefix: "/v1/users" });
  await app.register(subscriptionRoutes, { prefix: "/v1/subscription" });
  await app.register(licenseRoutes,      { prefix: "/v1/license" });
  await app.register(webhookRoutes,      { prefix: "/v1/webhooks" });
  await app.register(telemetryRoutes,    { prefix: "/v1/telemetry" });
  await app.register(updateRoutes,       { prefix: "/v1/updates" });
  await app.register(adminRoutes,        { prefix: "/v1/admin" });

  // ── Health check ──────────────────────────────────────────────────────────

  app.get("/health", async () => ({
    status: "ok",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }));

  // ── Global 404 ────────────────────────────────────────────────────────────

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({ error: "Not found" });
  });

  // ── Global error handler ──────────────────────────────────────────────────

  app.setErrorHandler((error: { statusCode?: number; message: string; stack?: string }, request, reply) => {
    app.log.error({ err: error, url: request.url, method: request.method }, "Unhandled error");

    // Don't leak stack traces in production
    if (process.env.NODE_ENV === "production") {
      reply.code(error.statusCode ?? 500).send({ error: "Internal server error" });
    } else {
      reply.code(error.statusCode ?? 500).send({
        error: error.message,
        stack: error.stack,
      });
    }
  });

  // ── Listen ────────────────────────────────────────────────────────────────

  const port = parseInt(process.env.PORT ?? "3001", 10);
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({ port, host });
  app.log.info(`redcore Cloud API listening on ${host}:${port}`);
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Shutdown signal received");
  await app.close();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// ─── Start ────────────────────────────────────────────────────────────────────

start().catch((err) => {
  console.error("Fatal: failed to start Cloud API:", err);
  process.exit(1);
});
