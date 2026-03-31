import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, desc, gte, sql, and, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import { telemetryEvents } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const eventPropertiesSchema = z
  .object({
    cpuVendor: z.string().max(100).optional(),
    gpuVendor: z.string().max(100).optional(),
    ramGb: z.number().optional(),
    windowsBuild: z.string().max(50).optional(),
    appVersion: z.string().max(20).optional(),
    feature: z.string().max(100).optional(),
    actionId: z.string().max(100).optional(),
    category: z.string().max(100).optional(),
    durationMs: z.number().int().optional(),
    success: z.boolean().optional(),
    errorCode: z.string().max(50).optional(),
    errorCategory: z.string().max(100).optional(),
    machineProfile: z.string().max(50).optional(),
    actionsApplied: z.number().int().optional(),
    totalActions: z.number().int().optional(),
  })
  .passthrough();

const singleEventSchema = z.object({
  event: z.string().min(1).max(64),
  properties: eventPropertiesSchema.optional(),
  clientTimestamp: z.string().datetime().optional(),
});

const batchEventsSchema = z.object({
  sessionId: z.string().uuid(),
  optIn: z.boolean(),
  events: z.array(singleEventSchema).min(1).max(50),
});

const optOutSchema = z.object({
  sessionId: z.string().uuid(),
});

const crashSchema = z.object({
  sessionId: z.string().uuid(),
  optIn: z.boolean(),
  appVersion: z.string().max(20),
  windowsBuild: z.string().max(50).optional(),
  errorCode: z.string().max(50),
  errorMessage: z.string().max(500),
  topFrame: z.string().max(200).optional(),
});

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default async function telemetryRoutes(app: FastifyInstance): Promise<void> {
  // -----------------------------------------------------------------------
  // POST /events (public — no auth required, respects optIn)
  // -----------------------------------------------------------------------
  app.post('/events', async (request, reply) => {
    const parsed = batchEventsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const { sessionId, optIn, events } = parsed.data;

    // Only store if user has opted in
    if (!optIn) {
      return reply.send({ success: true, data: { stored: 0 } });
    }

    const rows = events.map((evt) => ({
      sessionId,
      product: "os" as const,
      eventType: evt.event,
      metadata: evt.properties ?? null,
      optIn: true,
      clientTimestamp: evt.clientTimestamp ? new Date(evt.clientTimestamp) : null,
      appVersion: (evt.properties?.appVersion as string) ?? null,
      windowsBuild: (evt.properties?.windowsBuild as string) ?? null,
    }));

    await db.insert(telemetryEvents).values(rows);

    return reply.send({ success: true, data: { stored: rows.length } });
  });

  // -----------------------------------------------------------------------
  // POST /opt-out
  // -----------------------------------------------------------------------
  app.post('/opt-out', async (request, reply) => {
    const parsed = optOutSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed' },
      });
    }

    const deleted = await db
      .delete(telemetryEvents)
      .where(eq(telemetryEvents.sessionId, parsed.data.sessionId))
      .returning({ id: telemetryEvents.id });

    return reply.send({
      success: true,
      data: { deleted: deleted.length },
    });
  });

  // -----------------------------------------------------------------------
  // POST /crash (public)
  // -----------------------------------------------------------------------
  app.post('/crash', async (request, reply) => {
    const parsed = crashSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const { sessionId, optIn, appVersion, windowsBuild, errorCode, errorMessage, topFrame } =
      parsed.data;

    if (!optIn) {
      return reply.send({ success: true, data: { stored: false } });
    }

    await db.insert(telemetryEvents).values({
      sessionId,
      product: "os" as const,
      eventType: 'crash',
      metadata: { errorCode, errorMessage, topFrame },
      optIn: true,
      appVersion,
      windowsBuild: windowsBuild ?? null,
    });

    return reply.send({ success: true, data: { stored: true } });
  });

  // -----------------------------------------------------------------------
  // Admin analytics routes
  // -----------------------------------------------------------------------

  // GET /analytics/overview (admin)
  app.get(
    '/analytics/overview',
    { preHandler: [requireAuth, requireAdmin] },
    async (_request, reply) => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60_000);

      const [dau] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${telemetryEvents.sessionId})` })
        .from(telemetryEvents)
        .where(gte(telemetryEvents.createdAt, oneDayAgo));

      const [wau] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${telemetryEvents.sessionId})` })
        .from(telemetryEvents)
        .where(gte(telemetryEvents.createdAt, sevenDaysAgo));

      const [mau] = await db
        .select({ count: sql<number>`COUNT(DISTINCT ${telemetryEvents.sessionId})` })
        .from(telemetryEvents)
        .where(gte(telemetryEvents.createdAt, thirtyDaysAgo));

      // 7-day trend (daily active sessions)
      const trend = await db
        .select({
          date: sql<string>`DATE(${telemetryEvents.createdAt})`,
          sessions: sql<number>`COUNT(DISTINCT ${telemetryEvents.sessionId})`,
        })
        .from(telemetryEvents)
        .where(gte(telemetryEvents.createdAt, sevenDaysAgo))
        .groupBy(sql`DATE(${telemetryEvents.createdAt})`)
        .orderBy(sql`DATE(${telemetryEvents.createdAt})`);

      return reply.send({
        success: true,
        data: {
          dau: dau?.count ?? 0,
          wau: wau?.count ?? 0,
          mau: mau?.count ?? 0,
          trend,
        },
      });
    },
  );

  // GET /analytics/features (admin)
  app.get(
    '/analytics/features',
    { preHandler: [requireAuth, requireAdmin] },
    async (_request, reply) => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000);

      const features = await db
        .select({
          event: telemetryEvents.eventType,
          count: count(),
        })
        .from(telemetryEvents)
        .where(
          and(
            gte(telemetryEvents.createdAt, sevenDaysAgo),
            sql`${telemetryEvents.eventType} NOT IN ('crash', 'session_start', 'session_end')`,
          ),
        )
        .groupBy(telemetryEvents.eventType)
        .orderBy(desc(count()))
        .limit(20);

      return reply.send({ success: true, data: { features } });
    },
  );

  // GET /analytics/errors (admin)
  app.get(
    '/analytics/errors',
    { preHandler: [requireAuth, requireAdmin] },
    async (_request, reply) => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000);

      const errors = await db
        .select({
          event: telemetryEvents.eventType,
          count: count(),
        })
        .from(telemetryEvents)
        .where(
          and(
            gte(telemetryEvents.createdAt, sevenDaysAgo),
            eq(telemetryEvents.eventType, 'crash'),
          ),
        )
        .groupBy(telemetryEvents.eventType)
        .orderBy(desc(count()))
        .limit(20);

      // Error code distribution from crash properties
      const errorCodes = await db
        .select({
          errorCode: sql<string>`${telemetryEvents.metadata}->>'errorCode'`,
          count: count(),
        })
        .from(telemetryEvents)
        .where(
          and(
            gte(telemetryEvents.createdAt, sevenDaysAgo),
            eq(telemetryEvents.eventType, 'crash'),
          ),
        )
        .groupBy(sql`${telemetryEvents.metadata}->>'errorCode'`)
        .orderBy(desc(count()))
        .limit(20);

      return reply.send({
        success: true,
        data: { crashEvents: errors, errorCodes },
      });
    },
  );

  // GET /analytics/hardware (admin)
  app.get(
    '/analytics/hardware',
    { preHandler: [requireAuth, requireAdmin] },
    async (_request, reply) => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60_000);

      const cpuDist = await db
        .select({
          vendor: sql<string>`${telemetryEvents.metadata}->>'cpuVendor'`,
          count: count(),
        })
        .from(telemetryEvents)
        .where(
          and(
            gte(telemetryEvents.createdAt, thirtyDaysAgo),
            sql`${telemetryEvents.metadata}->>'cpuVendor' IS NOT NULL`,
          ),
        )
        .groupBy(sql`${telemetryEvents.metadata}->>'cpuVendor'`)
        .orderBy(desc(count()))
        .limit(10);

      const ramDist = await db
        .select({
          ramGb: sql<string>`${telemetryEvents.metadata}->>'ramGb'`,
          count: count(),
        })
        .from(telemetryEvents)
        .where(
          and(
            gte(telemetryEvents.createdAt, thirtyDaysAgo),
            sql`${telemetryEvents.metadata}->>'ramGb' IS NOT NULL`,
          ),
        )
        .groupBy(sql`${telemetryEvents.metadata}->>'ramGb'`)
        .orderBy(desc(count()))
        .limit(10);

      const buildDist = await db
        .select({
          windowsBuild: telemetryEvents.windowsBuild,
          count: count(),
        })
        .from(telemetryEvents)
        .where(
          and(
            gte(telemetryEvents.createdAt, thirtyDaysAgo),
            sql`${telemetryEvents.windowsBuild} IS NOT NULL`,
          ),
        )
        .groupBy(telemetryEvents.windowsBuild)
        .orderBy(desc(count()))
        .limit(10);

      return reply.send({
        success: true,
        data: {
          cpuDistribution: cpuDist,
          ramDistribution: ramDist,
          windowsBuildDistribution: buildDist,
        },
      });
    },
  );
}
