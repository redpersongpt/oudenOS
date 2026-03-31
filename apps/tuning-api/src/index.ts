// ─── redcore-Tuning Cloud API ───────────────────────────────────────────────
// Handles: accounts, auth, subscription licensing, device binding,
// anonymized telemetry, update metadata, crash reporting.
//
// NOT responsible for: any system tuning, benchmarking, or privileged ops.
// Those happen entirely on-device in the Rust service.

import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { updateRoutes } from "./routes/updates.js";

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

  // CORS — kept for the catalog manifest consumed by desktop clients
  await app.register(cors, {
    origin: [
      "https://redcoreos.net",
      "http://localhost:5173",
    ],
    credentials: true,
  });

  // Slim product API: only the App Hub catalog remains here.
  await app.register(updateRoutes, { prefix: "/v1/updates" });

  // Health check
  app.get("/health", async () => ({ status: "ok", surface: "catalog", version: "0.1.0" }));

  const port = parseInt(process.env.PORT ?? "3001", 10);
  const host = process.env.HOST ?? "0.0.0.0";

  await app.listen({ port, host });
  app.log.info(`Tuning API listening on ${host}:${port}`);
}

// ─── Error handling ─────────────────────────────────────────────────────────

app.setErrorHandler((error, _request, reply) => {
  const err = error as { statusCode?: number; message: string; stack?: string };
  const statusCode = err.statusCode ?? 500;

  if (statusCode >= 500) {
    app.log.error(error);
  }

  if (process.env.NODE_ENV === "production") {
    reply.code(statusCode).send({ error: "Internal server error" });
  } else {
    reply.code(statusCode).send({ error: err.message, stack: err.stack });
  }
});

app.setNotFoundHandler((_request, reply) => {
  reply.code(404).send({ error: "Not found" });
});

// ─── Graceful shutdown ──────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Shutdown signal received");
  await app.close();
  process.exit(0);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// ─── Start ──────────────────────────────────────────────────────────────────

start().catch((err) => {
  console.error("Fatal: failed to start Tuning API:", err);
  process.exit(1);
});
