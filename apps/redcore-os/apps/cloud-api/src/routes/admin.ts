import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, desc, ilike, sql, and, gte, count } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  users,
  subscriptions,
  machineActivations,
  adminAuditLog,
  telemetryEvents,
  paymentHistory,
  fleetGroups,
} from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/admin.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const searchSchema = paginationSchema.extend({
  search: z.string().max(200).optional(),
});

const updateUserSchema = z.object({
  email: z.string().email().max(320).optional(),
  displayName: z.string().max(100).optional(),
  role: z.enum(['user', 'admin']).optional(),
  disabled: z.boolean().optional(),
});

const overrideSubscriptionSchema = z.object({
  tier: z.enum(['free', 'pro', 'enterprise']),
  billingPeriod: z.enum(['monthly', 'annual']).optional(),
  reason: z.string().min(1).max(500),
});

const giftProSchema = z.object({
  days: z.number().int().min(1).max(365),
  reason: z.string().min(1).max(500),
});

const auditLogQuerySchema = paginationSchema.extend({
  action: z.string().optional(),
  adminId: z.string().uuid().optional(),
});

const machinesQuerySchema = paginationSchema.extend({
  userId: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireAdmin);

  // -----------------------------------------------------------------------
  // GET /users
  // -----------------------------------------------------------------------
  app.get('/users', async (request, reply) => {
    const query = searchSchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: query.error.flatten() },
      });
    }

    const { page, limit, search } = query.data;
    const offset = (page - 1) * limit;

    const conditions = search
      ? ilike(users.email, `%${search}%`)
      : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(users)
      .where(conditions);

    const total = totalResult?.count ?? 0;

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        role: users.role,
        emailVerified: users.emailVerified,
        deletedAt: users.deletedAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(conditions)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return reply.send({
      success: true,
      data: { users: rows },
      meta: { total, page, limit },
    });
  });

  // -----------------------------------------------------------------------
  // GET /users/:id
  // -----------------------------------------------------------------------
  app.get<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
    const { id } = request.params;

    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'ADM_001', message: 'User not found' },
      });
    }

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, id))
      .limit(1);

    const machines = await db
      .select()
      .from(machineActivations)
      .where(eq(machineActivations.userId, id));

    return reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          emailVerified: user.emailVerified,
          stripeCustomerId: user.stripeCustomerId,
          deletedAt: user.deletedAt,
          createdAt: user.createdAt,
        },
        subscription: sub,
        machines,
      },
    });
  });

  // -----------------------------------------------------------------------
  // PATCH /users/:id
  // -----------------------------------------------------------------------
  app.patch<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
    const { id } = request.params;
    const parsed = updateUserSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.email !== undefined) updates.email = parsed.data.email.toLowerCase();
    if (parsed.data.displayName !== undefined) updates.displayName = parsed.data.displayName;
    if (parsed.data.role !== undefined) updates.role = parsed.data.role;
    if (parsed.data.disabled !== undefined) {
      updates.deletedAt = parsed.data.disabled ? new Date() : null;

      await db.insert(adminAuditLog).values({
        adminId: request.userId,
        targetUserId: id,
        action: 'user_disabled',
        reason: parsed.data.disabled ? 'Disabled by admin' : 'Re-enabled by admin',
      });
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({
        success: false,
        error: { code: 'ADM_001', message: 'User not found' },
      });
    }

    return reply.send({
      success: true,
      data: {
        user: {
          id: updated.id,
          email: updated.email,
          displayName: updated.displayName,
          role: updated.role,
          deletedAt: updated.deletedAt,
        },
      },
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /users/:id
  // -----------------------------------------------------------------------
  app.delete<{ Params: { id: string } }>('/users/:id', async (request, reply) => {
    const { id } = request.params;

    const [updated] = await db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({
        success: false,
        error: { code: 'ADM_001', message: 'User not found' },
      });
    }

    await db.insert(adminAuditLog).values({
      adminId: request.userId,
      targetUserId: id,
      action: 'user_deleted',
      reason: 'Deleted by admin',
    });

    return reply.send({ success: true, data: { message: 'User soft-deleted' } });
  });

  // -----------------------------------------------------------------------
  // POST /users/:id/subscription
  // -----------------------------------------------------------------------
  app.post<{ Params: { id: string } }>(
    '/users/:id/subscription',
    async (request, reply) => {
      const { id } = request.params;
      const parsed = overrideSubscriptionSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
        });
      }

      const { tier, billingPeriod, reason } = parsed.data;

      const [existing] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, id))
        .limit(1);

      if (existing) {
        await db
          .update(subscriptions)
          .set({
            tier,
            status: 'active',
            billingPeriod: billingPeriod ?? existing.billingPeriod,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, existing.id));
      } else {
        await db.insert(subscriptions).values({
          userId: id,
          tier,
          status: 'active',
          billingPeriod: billingPeriod ?? 'monthly',
        });
      }

      await db.insert(adminAuditLog).values({
        adminId: request.userId,
        targetUserId: id,
        action: 'subscription_override',
        reason,
        metadata: { tier, billingPeriod },
      });

      return reply.send({
        success: true,
        data: { message: `Subscription overridden to ${tier}` },
      });
    },
  );

  // -----------------------------------------------------------------------
  // POST /users/:id/gift-pro
  // -----------------------------------------------------------------------
  app.post<{ Params: { id: string } }>(
    '/users/:id/gift-pro',
    async (request, reply) => {
      const { id } = request.params;
      const parsed = giftProSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          success: false,
          error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
        });
      }

      const { days, reason } = parsed.data;
      const periodEnd = new Date(Date.now() + days * 24 * 60 * 60_000);

      const [existing] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, id))
        .limit(1);

      if (existing) {
        await db
          .update(subscriptions)
          .set({
            tier: 'pro',
            status: 'active',
            currentPeriodEnd: periodEnd,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.id, existing.id));
      } else {
        await db.insert(subscriptions).values({
          userId: id,
          tier: 'pro',
          status: 'active',
          currentPeriodEnd: periodEnd,
        });
      }

      await db.insert(adminAuditLog).values({
        adminId: request.userId,
        targetUserId: id,
        action: 'gift_pro',
        reason,
        metadata: { days, expiresAt: periodEnd.toISOString() },
      });

      return reply.send({
        success: true,
        data: { message: `Gifted ${days} days of Pro`, expiresAt: periodEnd.toISOString() },
      });
    },
  );

  // -----------------------------------------------------------------------
  // GET /stats/revenue
  // -----------------------------------------------------------------------
  app.get('/stats/revenue', async (_request, reply) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60_000);

    // Active subscription counts by tier
    const tierCounts = await db
      .select({
        tier: subscriptions.tier,
        count: count(),
      })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'))
      .groupBy(subscriptions.tier);

    const tierMap: Record<string, number> = {};
    for (const row of tierCounts) {
      tierMap[row.tier] = row.count;
    }

    // Recent payments for MRR calculation
    const recentPayments = await db
      .select({
        total: sql<number>`COALESCE(SUM(${paymentHistory.amount}), 0)`,
      })
      .from(paymentHistory)
      .where(
        and(
          eq(paymentHistory.status, 'succeeded'),
          gte(paymentHistory.createdAt, thirtyDaysAgo),
        ),
      );

    const mrr = recentPayments[0]?.total ?? 0;

    // Cancelled in last 30 days
    const [churnResult] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.status, 'cancelled'),
          gte(subscriptions.cancelledAt, thirtyDaysAgo),
        ),
      );

    // New subscriptions in last 30 days
    const [newSubsResult] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(gte(subscriptions.createdAt, thirtyDaysAgo));

    return reply.send({
      success: true,
      data: {
        mrr,
        arr: mrr * 12,
        churn: churnResult?.count ?? 0,
        newSubscriptions: newSubsResult?.count ?? 0,
        activeSubscriptions: Object.values(tierMap).reduce((a, b) => a + b, 0),
        freeUsers: tierMap['free'] ?? 0,
        proUsers: tierMap['pro'] ?? 0,
        enterpriseUsers: tierMap['enterprise'] ?? 0,
      },
    });
  });

  // -----------------------------------------------------------------------
  // GET /stats/telemetry
  // -----------------------------------------------------------------------
  app.get('/stats/telemetry', async (_request, reply) => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60_000);

    const [dauResult] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${telemetryEvents.sessionId})`,
      })
      .from(telemetryEvents)
      .where(gte(telemetryEvents.serverTimestamp, oneDayAgo));

    const [wauResult] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${telemetryEvents.sessionId})`,
      })
      .from(telemetryEvents)
      .where(gte(telemetryEvents.serverTimestamp, sevenDaysAgo));

    const [mauResult] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${telemetryEvents.sessionId})`,
      })
      .from(telemetryEvents)
      .where(gte(telemetryEvents.serverTimestamp, thirtyDaysAgo));

    const topEvents = await db
      .select({
        event: telemetryEvents.event,
        count: count(),
      })
      .from(telemetryEvents)
      .where(gte(telemetryEvents.serverTimestamp, sevenDaysAgo))
      .groupBy(telemetryEvents.event)
      .orderBy(desc(count()))
      .limit(10);

    const osDist = await db
      .select({
        windowsBuild: telemetryEvents.windowsBuild,
        count: count(),
      })
      .from(telemetryEvents)
      .where(gte(telemetryEvents.serverTimestamp, thirtyDaysAgo))
      .groupBy(telemetryEvents.windowsBuild)
      .orderBy(desc(count()))
      .limit(10);

    return reply.send({
      success: true,
      data: {
        dau: dauResult?.count ?? 0,
        wau: wauResult?.count ?? 0,
        mau: mauResult?.count ?? 0,
        topEvents,
        windowsBuildDistribution: osDist,
      },
    });
  });

  // -----------------------------------------------------------------------
  // GET /machines
  // -----------------------------------------------------------------------
  app.get('/machines', async (request, reply) => {
    const query = machinesQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed' },
      });
    }

    const { page, limit, userId } = query.data;
    const offset = (page - 1) * limit;

    const conditions = userId
      ? eq(machineActivations.userId, userId)
      : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(machineActivations)
      .where(conditions);

    const machines = await db
      .select()
      .from(machineActivations)
      .where(conditions)
      .orderBy(desc(machineActivations.createdAt))
      .limit(limit)
      .offset(offset);

    return reply.send({
      success: true,
      data: { machines },
      meta: { total: totalResult?.count ?? 0, page, limit },
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /machines/:id
  // -----------------------------------------------------------------------
  app.delete<{ Params: { id: string } }>('/machines/:id', async (request, reply) => {
    const { id } = request.params;

    const [machine] = await db
      .update(machineActivations)
      .set({ status: 'revoked', revokedAt: new Date() })
      .where(eq(machineActivations.id, id))
      .returning();

    if (!machine) {
      return reply.status(404).send({
        success: false,
        error: { code: 'ADM_010', message: 'Machine not found' },
      });
    }

    await db.insert(adminAuditLog).values({
      adminId: request.userId,
      targetUserId: machine.userId,
      action: 'machine_revoked',
      reason: 'Revoked by admin',
      metadata: { machineId: id, fingerprint: machine.deviceFingerprint },
    });

    return reply.send({ success: true, data: { message: 'Machine revoked' } });
  });

  // -----------------------------------------------------------------------
  // GET /fleet-groups
  // -----------------------------------------------------------------------
  app.get('/fleet-groups', async (_request, reply) => {
    const groups = await db
      .select()
      .from(fleetGroups)
      .orderBy(desc(fleetGroups.createdAt));

    return reply.send({ success: true, data: { fleetGroups: groups } });
  });

  // -----------------------------------------------------------------------
  // GET /audit-log
  // -----------------------------------------------------------------------
  app.get('/audit-log', async (request, reply) => {
    const query = auditLogQuerySchema.safeParse(request.query);
    if (!query.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed' },
      });
    }

    const { page, limit, action, adminId } = query.data;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (action) conditions.push(eq(adminAuditLog.action, action as typeof adminAuditLog.action.enumValues[number]));
    if (adminId) conditions.push(eq(adminAuditLog.adminId, adminId));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalResult] = await db
      .select({ count: count() })
      .from(adminAuditLog)
      .where(whereClause);

    const logs = await db
      .select()
      .from(adminAuditLog)
      .where(whereClause)
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(limit)
      .offset(offset);

    return reply.send({
      success: true,
      data: { auditLog: logs },
      meta: { total: totalResult?.count ?? 0, page, limit },
    });
  });
}
