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
      "https://app.redcore-tuning.com",
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
  app.log.info(`Cloud API listening on ${host}:${port}`);
}

start().catch((err) => {
  console.error("Failed to start cloud API:", err);
  process.exit(1);
});
