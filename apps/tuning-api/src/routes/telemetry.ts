// ─── Telemetry Routes ─────────────────────────────────────────────────────────
// Opt-in only. All events are anonymized — no PII is accepted or stored.
// Batch ingestion with offline queue support (returns accepted:true immediately).
// Analytics endpoints are admin-only.

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAdmin } from "../middleware/admin.js";

// ─── Event schema ─────────────────────────────────────────────────────────────

const TelemetryEventSchema = z.object({
  event: z.string().max(64),
  // Anonymized context — no user-identifying data allowed
  properties: z
    .object({
      // Hardware class identifiers (never specific serial numbers)
      cpuVendor: z.string().optional(),
      cpuClass: z.string().optional(),
      gpuVendor: z.string().optional(),
      ramGb: z.number().optional(),
      windowsBuild: z.string().optional(),

      // App context
      appVersion: z.string().optional(),
      feature: z.string().optional(),
      actionId: z.string().optional(),
      durationMs: z.number().optional(),
      success: z.boolean().optional(),

      // Error context (no stack traces with PII)
      errorCode: z.string().optional(),
      errorCategory: z.string().optional(),

      // Metric deltas (no absolute values that could fingerprint a machine)
      latencyDeltaMs: z.number().optional(),
      benchmarkDeltaPct: z.number().optional(),
    })
    .optional(),
  // ISO timestamp from client; server records its own for trust
  clientTimestamp: z.string().datetime().optional(),
});

const BatchEventSchema = z.object({
  // Stable session ID (random per-session UUID, not tied to user/machine PII)
  sessionId: z.string().uuid(),
  // Whether the user has opted into telemetry (must be true for server to store)
  optIn: z.boolean(),
  events: z.array(TelemetryEventSchema).max(100),
});

type TelemetryEvent = z.infer<typeof TelemetryEventSchema> & {
  serverTimestamp: string;
  sessionId: string;
};

// ─── In-memory event store (replace with ClickHouse / TimescaleDB / pg) ──────

const eventStore: TelemetryEvent[] = [];
const MAX_STORE = 100_000;

function ingestEvents(sessionId: string, events: z.infer<typeof TelemetryEventSchema>[]): void {
  for (const ev of events) {
    eventStore.push({ ...ev, sessionId, serverTimestamp: new Date().toISOString() });
  }
  // TODO: INSERT INTO telemetry_events (session_id, event, properties, server_ts)
  // Use batch insert for performance (pg COPY or drizzle batch)
  if (eventStore.length > MAX_STORE) {
    eventStore.splice(0, eventStore.length - MAX_STORE);
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

export const telemetryRoutes: FastifyPluginAsync = async (app) => {
  // ── POST /telemetry/events ────────────────────────────────────────────────
  // Batch ingestion. Clients may call this while online or flush an offline queue.
  // Returns accepted:true immediately (fire-and-forget on server side).
  app.post<{ Body: unknown }>("/events", async (request, reply) => {
    const parsed = BatchEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid batch", details: parsed.error.flatten() });
    }

    const { sessionId, optIn, events } = parsed.data;

    if (!optIn) {
      // Respect opt-out: acknowledge receipt but discard
      return { accepted: false, reason: "opt-out", queued: false, count: 0 };
    }

    ingestEvents(sessionId, events);

    return {
      accepted: true,
      queued: false,
      count: events.length,
      serverTimestamp: new Date().toISOString(),
    };
  });

  // ── POST /telemetry/opt-out ───────────────────────────────────────────────
  // Purge any stored events for the given session.
  app.post<{ Body: unknown }>("/opt-out", async (request, reply) => {
    const parsed = z.object({ sessionId: z.string().uuid() }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid body" });

    const { sessionId } = parsed.data;
    // TODO: DELETE FROM telemetry_events WHERE session_id = $sessionId
    const before = eventStore.length;
    for (let i = eventStore.length - 1; i >= 0; i--) {
      if (eventStore[i]!.sessionId === sessionId) eventStore.splice(i, 1);
    }
    const purged = before - eventStore.length;

    return { purged };
  });

  // ── POST /telemetry/crash ─────────────────────────────────────────────────
  // Accept crash reports (opt-in only, anonymized).
  app.post<{ Body: unknown }>("/crash", async (request, reply) => {
    const parsed = z
      .object({
        optIn: z.boolean(),
        sessionId: z.string().uuid(),
        appVersion: z.string(),
        windowsBuild: z.string().optional(),
        serviceVersion: z.string().optional(),
        errorCode: z.string(),
        errorMessage: z.string().max(500),
        // No full stack trace accepted — too much PII risk
        topFrame: z.string().max(200).optional(),
      })
      .safeParse(request.body);

    if (!parsed.success) return reply.code(400).send({ error: "Invalid crash report" });
    if (!parsed.data.optIn) return { accepted: false, reason: "opt-out" };

    // TODO: INSERT INTO crash_reports (...)
    app.log.info({ crashReport: parsed.data }, "Crash report received");

    return { accepted: true };
  });

  // ── Admin analytics (all require admin JWT) ───────────────────────────────

  // GET /telemetry/analytics/overview — DAU/WAU/MAU + retention
  app.get("/analytics/overview", { preHandler: requireAdmin }, async () => {
    // TODO: Real queries using session_id distinct counts grouped by day/week/month
    const now = new Date();
    const days7 = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      return { date: d.toISOString().slice(0, 10), dau: Math.floor(100 + Math.random() * 80) };
    }).reverse();

    return {
      dau: 142,
      wau: 891,
      mau: 2340,
      retentionD7Percent: 68.4,
      retentionD30Percent: 41.2,
      dauTrend: days7,
      totalSessions: eventStore.length,
      asOf: now.toISOString(),
    };
  });

  // GET /telemetry/analytics/features — feature usage breakdown
  app.get("/analytics/features", { preHandler: requireAdmin }, async () => {
    // TODO: SELECT properties->>'feature', COUNT(*), COUNT(DISTINCT session_id)
    //        FROM telemetry_events WHERE event='feature.used' GROUP BY 1 ORDER BY 2 DESC
    const featureCounts: Record<string, number> = {};
    for (const ev of eventStore) {
      const feature = ev.properties?.feature;
      if (feature) featureCounts[feature] = (featureCounts[feature] ?? 0) + 1;
    }

    const features = Object.entries(featureCounts)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return { features, totalEvents: eventStore.length, asOf: new Date().toISOString() };
  });

  // GET /telemetry/analytics/errors — error rate + top errors
  app.get("/analytics/errors", { preHandler: requireAdmin }, async () => {
    // TODO: SELECT properties->>'errorCode', COUNT(*), MAX(server_ts) as last_seen
    //        FROM telemetry_events WHERE event='error' GROUP BY 1 ORDER BY 2 DESC
    const errorCounts: Record<string, { count: number; lastSeen: string }> = {};
    for (const ev of eventStore) {
      if (ev.event !== "error" || !ev.properties?.errorCode) continue;
      const code = ev.properties.errorCode;
      const existing = errorCounts[code];
      if (!existing || ev.serverTimestamp > existing.lastSeen) {
        errorCounts[code] = {
          count: (existing?.count ?? 0) + 1,
          lastSeen: ev.serverTimestamp,
        };
      } else {
        existing.count++;
      }
    }

    const errors = Object.entries(errorCounts)
      .map(([code, { count, lastSeen }]) => ({ code, count, lastSeen }))
      .sort((a, b) => b.count - a.count);

    const totalEvents = eventStore.length;
    const errorRate = totalEvents > 0 ? (errors.reduce((s, e) => s + e.count, 0) / totalEvents) * 1000 : 0;

    return {
      errorRatePer1k: parseFloat(errorRate.toFixed(2)),
      topErrors: errors.slice(0, 20),
      asOf: new Date().toISOString(),
    };
  });

  // GET /telemetry/analytics/hardware — hardware distribution
  app.get("/analytics/hardware", { preHandler: requireAdmin }, async () => {
    // TODO: SELECT properties->>'cpuVendor', COUNT(DISTINCT session_id) FROM telemetry_events
    //        WHERE properties->>'cpuVendor' IS NOT NULL GROUP BY 1
    const cpuVendors: Record<string, number> = {};
    const gpuVendors: Record<string, number> = {};
    const windowsBuilds: Record<string, number> = {};
    const ramBuckets: Record<string, number> = {};

    for (const ev of eventStore) {
      if (ev.properties?.cpuVendor) {
        cpuVendors[ev.properties.cpuVendor] = (cpuVendors[ev.properties.cpuVendor] ?? 0) + 1;
      }
      if (ev.properties?.gpuVendor) {
        gpuVendors[ev.properties.gpuVendor] = (gpuVendors[ev.properties.gpuVendor] ?? 0) + 1;
      }
      if (ev.properties?.windowsBuild) {
        windowsBuilds[ev.properties.windowsBuild] = (windowsBuilds[ev.properties.windowsBuild] ?? 0) + 1;
      }
      if (ev.properties?.ramGb != null) {
        const bucket = ev.properties.ramGb >= 64 ? "64+" : String(ev.properties.ramGb);
        ramBuckets[bucket] = (ramBuckets[bucket] ?? 0) + 1;
      }
    }

    return {
      cpuVendors,
      gpuVendors,
      windowsBuilds,
      ramBuckets,
      totalSessions: new Set(eventStore.map((e) => e.sessionId)).size,
      asOf: new Date().toISOString(),
    };
  });
};
