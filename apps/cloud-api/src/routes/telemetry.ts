// ─── Telemetry Routes ──────────────────────────────────────────────────────────
// Opt-in only. No PII stored. Session ID is a random UUID per app session.
//
// POST /events              — batch event ingestion → writes to DB
// POST /opt-out             — purge stored events for a session
// POST /crash               — crash report ingestion
// GET  /analytics/overview  — DAU/WAU/MAU  (admin)
// GET  /analytics/features  — feature usage (admin)
// GET  /analytics/errors    — error rates   (admin)
// GET  /analytics/hardware  — HW dist       (admin)

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, gte, count, sql } from "drizzle-orm";
import { db, telemetryEvents } from "../db/index.js";
import { requireAdmin } from "../middleware/admin.js";
import { telemetryRateLimit } from "../lib/rate-limit.js";

// ─── Event schema ─────────────────────────────────────────────────────────────

const TelemetryEventSchema = z.object({
  event: z.string().max(64),
  properties: z
    .object({
      cpuVendor: z.string().max(32).optional(),
      cpuClass: z.string().max(64).optional(),
      gpuVendor: z.string().max(32).optional(),
      ramGb: z.number().int().min(0).max(4096).optional(),
      windowsBuild: z.string().max(20).optional(),
      appVersion: z.string().max(20).optional(),
      feature: z.string().max(64).optional(),
      actionId: z.string().max(64).optional(),
      durationMs: z.number().int().min(0).max(300_000).optional(),
      success: z.boolean().optional(),
      errorCode: z.string().max(64).optional(),
      errorCategory: z.string().max(64).optional(),
      latencyDeltaMs: z.number().optional(),
      benchmarkDeltaPct: z.number().optional(),
    })
    .optional(),
  clientTimestamp: z.string().datetime().optional(),
});

const BatchSchema = z.object({
  sessionId: z.string().uuid(),
  optIn: z.boolean(),
  appVersion: z.string().max(20).optional(),
  osVersion: z.string().max(100).optional(),
  events: z.array(TelemetryEventSchema).max(100),
});

const CrashSchema = z.object({
  optIn: z.boolean(),
  sessionId: z.string().uuid(),
  appVersion: z.string().max(20),
  osVersion: z.string().max(100).optional(),
  serviceVersion: z.string().max(20).optional(),
  errorCode: z.string().max(64),
  errorMessage: z.string().max(500),
  topFrame: z.string().max(200).optional(),
});

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const telemetryRoutes: FastifyPluginAsync = async (app) => {
  // ── POST /events ─────────────────────────────────────────────────────────
  app.post("/events", { preHandler: telemetryRateLimit() }, async (request, reply) => {
    const parsed = BatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid batch payload", details: parsed.error.flatten() });
    }

    const { sessionId, optIn, appVersion, osVersion, events } = parsed.data;

    if (!optIn) {
      return reply.send({ accepted: false, reason: "opt_out", count: 0 });
    }

    if (events.length === 0) {
      return reply.send({ accepted: true, count: 0 });
    }

    // Batch insert — one row per event
    await db.insert(telemetryEvents).values(
      events.map((ev) => ({
        sessionId,
        eventType: ev.event,
        metadata: ev.properties ?? null,
        appVersion: appVersion ?? (ev.properties?.appVersion ?? null),
        osVersion: osVersion ?? null,
      })),
    );

    return reply.send({
      accepted: true,
      count: events.length,
      serverTimestamp: new Date().toISOString(),
    });
  });

  // ── POST /opt-out ─────────────────────────────────────────────────────────
  app.post("/opt-out", { preHandler: telemetryRateLimit() }, async (request, reply) => {
    const parsed = z.object({ sessionId: z.string().uuid() }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid body" });

    const result = await db
      .delete(telemetryEvents)
      .where(eq(telemetryEvents.sessionId, parsed.data.sessionId))
      .returning({ id: telemetryEvents.id });

    return reply.send({ purged: result.length });
  });

  // ── POST /crash ───────────────────────────────────────────────────────────
  app.post("/crash", { preHandler: telemetryRateLimit(5) }, async (request, reply) => {
    const parsed = CrashSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid crash report" });
    if (!parsed.data.optIn) return reply.send({ accepted: false, reason: "opt_out" });

    const { sessionId, appVersion, osVersion, errorCode, errorMessage, topFrame } = parsed.data;

    await db.insert(telemetryEvents).values({
      sessionId,
      eventType: "crash",
      metadata: { errorCode, errorMessage, topFrame: topFrame ?? null },
      appVersion,
      osVersion: osVersion ?? null,
    });

    app.log.info({ sessionId, errorCode, appVersion }, "Crash report ingested");
    return reply.send({ accepted: true });
  });

  // ── GET /analytics/overview ───────────────────────────────────────────────
  app.get("/analytics/overview", { preHandler: requireAdmin }, async (_request, reply) => {
    const now = new Date();
    const day1ago = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const day7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const day30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dauRow] = await db
      .select({ cnt: sql<number>`count(distinct session_id)` })
      .from(telemetryEvents)
      .where(gte(telemetryEvents.createdAt, day1ago));

    const [wauRow] = await db
      .select({ cnt: sql<number>`count(distinct session_id)` })
      .from(telemetryEvents)
      .where(gte(telemetryEvents.createdAt, day7ago));

    const [mauRow] = await db
      .select({ cnt: sql<number>`count(distinct session_id)` })
      .from(telemetryEvents)
      .where(gte(telemetryEvents.createdAt, day30ago));

    const [totalRow] = await db.select({ cnt: count() }).from(telemetryEvents);

    return reply.send({
      dau: Number(dauRow?.cnt ?? 0),
      wau: Number(wauRow?.cnt ?? 0),
      mau: Number(mauRow?.cnt ?? 0),
      totalEvents: Number(totalRow?.cnt ?? 0),
      asOf: now.toISOString(),
    });
  });

  // ── GET /analytics/features ────────────────────────────────────────────────
  app.get("/analytics/features", { preHandler: requireAdmin }, async (_request, reply) => {
    const rows = await db
      .select({
        feature: sql<string>`metadata->>'feature'`,
        cnt: sql<number>`count(*)`,
        unique_sessions: sql<number>`count(distinct session_id)`,
      })
      .from(telemetryEvents)
      .where(sql`event_type = 'feature.used' and metadata->>'feature' is not null`)
      .groupBy(sql`metadata->>'feature'`)
      .orderBy(sql`count(*) desc`)
      .limit(30);

    return reply.send({
      features: rows.map((r) => ({
        feature: r.feature,
        count: Number(r.cnt),
        uniqueSessions: Number(r.unique_sessions),
      })),
      asOf: new Date().toISOString(),
    });
  });

  // ── GET /analytics/errors ─────────────────────────────────────────────────
  app.get("/analytics/errors", { preHandler: requireAdmin }, async (_request, reply) => {
    const day30ago = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        errorCode: sql<string>`metadata->>'errorCode'`,
        cnt: sql<number>`count(*)`,
        lastSeen: sql<string>`max(created_at)`,
      })
      .from(telemetryEvents)
      .where(
        sql`event_type in ('error','crash') and metadata->>'errorCode' is not null and created_at >= ${day30ago}`,
      )
      .groupBy(sql`metadata->>'errorCode'`)
      .orderBy(sql`count(*) desc`)
      .limit(30);

    const [totalRow] = await db
      .select({ cnt: count() })
      .from(telemetryEvents)
      .where(gte(telemetryEvents.createdAt, day30ago));

    const totalEvents = Number(totalRow?.cnt ?? 0);
    const totalErrors = rows.reduce((s, r) => s + Number(r.cnt), 0);
    const errorRatePer1k = totalEvents > 0 ? (totalErrors / totalEvents) * 1000 : 0;

    return reply.send({
      errorRatePer1k: parseFloat(errorRatePer1k.toFixed(2)),
      topErrors: rows.map((r) => ({
        code: r.errorCode,
        count: Number(r.cnt),
        lastSeen: r.lastSeen,
      })),
      windowDays: 30,
      asOf: new Date().toISOString(),
    });
  });

  // ── GET /analytics/hardware ───────────────────────────────────────────────
  app.get("/analytics/hardware", { preHandler: requireAdmin }, async (_request, reply) => {
    const cpuRows = await db
      .select({
        vendor: sql<string>`metadata->>'cpuVendor'`,
        cnt: sql<number>`count(distinct session_id)`,
      })
      .from(telemetryEvents)
      .where(sql`metadata->>'cpuVendor' is not null`)
      .groupBy(sql`metadata->>'cpuVendor'`);

    const gpuRows = await db
      .select({
        vendor: sql<string>`metadata->>'gpuVendor'`,
        cnt: sql<number>`count(distinct session_id)`,
      })
      .from(telemetryEvents)
      .where(sql`metadata->>'gpuVendor' is not null`)
      .groupBy(sql`metadata->>'gpuVendor'`);

    const buildRows = await db
      .select({
        build: sql<string>`metadata->>'windowsBuild'`,
        cnt: sql<number>`count(distinct session_id)`,
      })
      .from(telemetryEvents)
      .where(sql`metadata->>'windowsBuild' is not null`)
      .groupBy(sql`metadata->>'windowsBuild'`);

    const ramRows = await db
      .select({
        ramGb: sql<number>`(metadata->>'ramGb')::int`,
        cnt: sql<number>`count(distinct session_id)`,
      })
      .from(telemetryEvents)
      .where(sql`metadata->>'ramGb' is not null`)
      .groupBy(sql`(metadata->>'ramGb')::int`);

    const toMap = (rows: { vendor?: string; build?: string; cnt: number }[], key: "vendor" | "build") =>
      Object.fromEntries(rows.map((r) => [r[key] ?? "unknown", Number(r.cnt)]));

    const ramBuckets: Record<string, number> = {};
    for (const r of ramRows) {
      const gb = Number(r.ramGb);
      const bucket = gb >= 64 ? "64+" : String(gb);
      ramBuckets[bucket] = (ramBuckets[bucket] ?? 0) + Number(r.cnt);
    }

    return reply.send({
      cpuVendors: toMap(cpuRows as never, "vendor"),
      gpuVendors: toMap(gpuRows as never, "vendor"),
      windowsBuilds: toMap(buildRows as never, "build"),
      ramBuckets,
      asOf: new Date().toISOString(),
    });
  });
};
