// ─── Admin Routes ──────────────────────────────────────────────────────────────
// All routes require admin JWT.
// Every mutating action is recorded in admin_audit_log.
//
// GET    /users                       — paginated user list + search
// GET    /users/:id                   — user detail
// PATCH  /users/:id                   — update name, email, role
// DELETE /users/:id                   — soft-delete user
// POST   /users/:id/subscription      — override subscription tier/status
// POST   /users/:id/gift-premium      — gift premium for N days
// GET    /stats/revenue               — MRR, ARR, churn, cohorts
// GET    /stats/telemetry             — aggregate telemetry stats
// GET    /machines                    — all machine activations (filterable)
// DELETE /machines/:id                — revoke machine
// GET    /audit-log                   — paginated audit log

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { eq, ilike, or, desc, count, and, gte, sql, inArray } from "drizzle-orm";
import {
  db,
  users,
  subscriptions,
  machineActivations,
  paymentHistory,
  adminAuditLog,
  telemetryEvents,
} from "../db/index.js";
import { requireAdmin } from "../middleware/admin.js";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).optional(),
  role: z.enum(["user", "admin"]).optional(),
});

const subscriptionOverrideSchema = z.object({
  tier: z.enum(["free", "premium", "expert"]),
  status: z.enum(["active", "past_due", "cancelled", "expired", "trialing"]),
  durationDays: z.number().int().min(1).max(3650).optional(),
  reason: z.string().min(1, "Reason is required for the audit log"),
});

const giftPremiumSchema = z.object({
  tier: z.enum(["premium", "expert"]).default("premium"),
  durationDays: z.number().int().min(1).max(3650),
  reason: z.string().min(1),
});

// ─── Audit helper ─────────────────────────────────────────────────────────────

async function audit(opts: {
  adminId: string;
  action: string;
  targetUserId?: string;
  targetResourceType?: string;
  targetResourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  await db.insert(adminAuditLog).values({
    adminId: opts.adminId,
    action: opts.action,
    targetUserId: opts.targetUserId ?? null,
    targetResourceType: opts.targetResourceType ?? null,
    targetResourceId: opts.targetResourceId ?? null,
    details: opts.details ?? null,
    ipAddress: opts.ipAddress ?? null,
  });
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // All admin routes require admin JWT
  app.addHook("preHandler", requireAdmin);

  // ── GET /users ────────────────────────────────────────────────────────────
  app.get<{ Querystring: { page?: string; limit?: string; search?: string; role?: string } }>(
    "/users",
    async (request, reply) => {
      const page = Math.max(1, parseInt(request.query.page ?? "1", 10));
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? "25", 10)));
      const search = request.query.search?.trim() ?? "";
      const roleFilter = request.query.role;

      const conditions = [];
      if (search) {
        // Escape SQL wildcard characters to prevent unintended pattern matching
        const escapedSearch = search.replace(/[%_\\]/g, "\\$&");
        conditions.push(
          or(
            ilike(users.email, `%${escapedSearch}%`),
            ilike(users.name, `%${escapedSearch}%`),
          ),
        );
      }
      if (roleFilter === "admin" || roleFilter === "user") {
        conditions.push(eq(users.role, roleFilter));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalRow] = await db
        .select({ cnt: count() })
        .from(users)
        .where(whereClause);

      const rows = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          emailVerified: users.emailVerified,
          oauthProvider: users.oauthProvider,
          createdAt: users.createdAt,
          deletedAt: users.deletedAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset((page - 1) * limit);

      // Fetch subscription tiers in one query
      const userIds = rows.map((u) => u.id);
      const subs = userIds.length > 0
        ? await db
            .select({ userId: subscriptions.userId, tier: subscriptions.tier, status: subscriptions.status })
            .from(subscriptions)
            .where(inArray(subscriptions.userId, userIds))
        : [];

      const subMap = new Map(subs.map((s) => [s.userId, s]));

      const total = Number(totalRow?.cnt ?? 0);

      return reply.send({
        users: rows.map((u) => ({
          ...u,
          tier: subMap.get(u.id)?.tier ?? "free",
          subscriptionStatus: subMap.get(u.id)?.status ?? "active",
        })),
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      });
    },
  );

  // ── GET /users/:id ────────────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>("/users/:id", async (request, reply) => {
    const { id } = request.params;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) return reply.code(404).send({ error: "User not found" });

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, id))
      .limit(1);

    const machines = await db
      .select({
        id: machineActivations.id,
        machineFingerprint: machineActivations.machineFingerprint,
        hostname: machineActivations.hostname,
        osVersion: machineActivations.osVersion,
        status: machineActivations.status,
        activatedAt: machineActivations.activatedAt,
        lastSeenAt: machineActivations.lastSeenAt,
      })
      .from(machineActivations)
      .where(eq(machineActivations.userId, id))
      .orderBy(desc(machineActivations.lastSeenAt));

    const recentPayments = await db
      .select({
        amount: paymentHistory.amount,
        currency: paymentHistory.currency,
        status: paymentHistory.status,
        createdAt: paymentHistory.createdAt,
      })
      .from(paymentHistory)
      .where(eq(paymentHistory.userId, id))
      .orderBy(desc(paymentHistory.createdAt))
      .limit(10);

    return reply.send({ user, subscription: sub ?? null, machines, recentPayments });
  });

  // ── PATCH /users/:id ──────────────────────────────────────────────────────
  app.patch<{ Params: { id: string }; Body: unknown }>("/users/:id", async (request, reply) => {
    const parse = updateUserSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input", details: parse.error.flatten() });
    }
    if (Object.keys(parse.data).length === 0) {
      return reply.code(400).send({ error: "Nothing to update" });
    }

    const { id } = request.params;
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
    if (!existing) return reply.code(404).send({ error: "User not found" });

    const [updated] = await db
      .update(users)
      .set({ ...parse.data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role });

    await audit({
      adminId: request.adminId,
      action: "user.update",
      targetUserId: id,
      targetResourceType: "user",
      targetResourceId: id,
      details: { updatedFields: Object.keys(parse.data) },
      ipAddress: request.ip,
    });

    return reply.send({ user: updated });
  });

  // ── DELETE /users/:id ─────────────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>("/users/:id", async (request, reply) => {
    const { id } = request.params;

    const [existing] = await db
      .select({ email: users.email, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!existing) return reply.code(404).send({ error: "User not found" });
    if (existing.deletedAt) return reply.code(409).send({ error: "User is already deleted" });

    await db
      .update(users)
      .set({
        email: `deleted+${id}@redcore.invalid`,
        name: null,
        passwordHash: null,
        avatarUrl: null,
        emailVerificationToken: null,
        passwordResetToken: null,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    await audit({
      adminId: request.adminId,
      action: "user.delete",
      targetUserId: id,
      targetResourceType: "user",
      targetResourceId: id,
      details: { originalEmail: existing.email },
      ipAddress: request.ip,
    });

    return reply.send({ ok: true, deletedUserId: id });
  });

  // ── POST /users/:id/subscription ─────────────────────────────────────────
  app.post<{ Params: { id: string }; Body: unknown }>(
    "/users/:id/subscription",
    async (request, reply) => {
      const parse = subscriptionOverrideSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.code(400).send({ error: "Invalid input", details: parse.error.flatten() });
      }

      const { id } = request.params;
      const { tier, status, durationDays, reason } = parse.data;

      const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
      if (!user) return reply.code(404).send({ error: "User not found" });

      const overrideExpiresAt = durationDays
        ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000)
        : null;

      const [existingSub] = await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(eq(subscriptions.userId, id))
        .limit(1);

      if (existingSub) {
        await db
          .update(subscriptions)
          .set({
            tier,
            status,
            manualOverride: true,
            overrideReason: reason,
            overrideExpiresAt,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.userId, id));
      } else {
        await db.insert(subscriptions).values({
          userId: id,
          tier,
          status,
          manualOverride: true,
          overrideReason: reason,
          overrideExpiresAt,
        });
      }

      await audit({
        adminId: request.adminId,
        action: "subscription.override",
        targetUserId: id,
        targetResourceType: "subscription",
        targetResourceId: id,
        details: { tier, status, durationDays, reason },
        ipAddress: request.ip,
      });

      return reply.send({ ok: true, tier, status, expiresAt: overrideExpiresAt });
    },
  );

  // ── POST /users/:id/gift-premium ──────────────────────────────────────────
  app.post<{ Params: { id: string }; Body: unknown }>(
    "/users/:id/gift-premium",
    async (request, reply) => {
      const parse = giftPremiumSchema.safeParse(request.body);
      if (!parse.success) {
        return reply.code(400).send({ error: "Invalid input", details: parse.error.flatten() });
      }

      const { id } = request.params;
      const { tier, durationDays, reason } = parse.data;

      const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
      if (!user) return reply.code(404).send({ error: "User not found" });

      const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

      const [existingSub] = await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(eq(subscriptions.userId, id))
        .limit(1);

      if (existingSub) {
        await db
          .update(subscriptions)
          .set({ tier, status: "active", manualOverride: true, overrideReason: reason, overrideExpiresAt: expiresAt, updatedAt: new Date() })
          .where(eq(subscriptions.userId, id));
      } else {
        await db.insert(subscriptions).values({
          userId: id, tier, status: "active", manualOverride: true, overrideReason: reason, overrideExpiresAt: expiresAt,
        });
      }

      await audit({
        adminId: request.adminId,
        action: "subscription.gift",
        targetUserId: id,
        targetResourceType: "subscription",
        targetResourceId: id,
        details: { tier, durationDays, expiresAt, reason },
        ipAddress: request.ip,
      });

      return reply.send({ ok: true, tier, expiresAt });
    },
  );

  // ── GET /stats/revenue ────────────────────────────────────────────────────
  app.get("/stats/revenue", async (_request, reply) => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [totalUsers] = await db.select({ cnt: count() }).from(users).where(sql`deleted_at is null`);

    const activeSubs = await db
      .select({ tier: subscriptions.tier, cnt: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"))
      .groupBy(subscriptions.tier);

    const subMap = Object.fromEntries(activeSubs.map((s) => [s.tier, Number(s.cnt)]));

    // MRR calculation (approximate — does not account for annual discounts)
    const premiumCount = subMap["premium"] ?? 0;
    const expertCount = subMap["expert"] ?? 0;
    const mrr = premiumCount * 9.99 + expertCount * 19.99;

    const [revenueThisMonth] = await db
      .select({ total: sql<number>`coalesce(sum(amount), 0)` })
      .from(paymentHistory)
      .where(and(gte(paymentHistory.createdAt, monthStart), eq(paymentHistory.status, "succeeded")));

    const [revenueLastMonth] = await db
      .select({ total: sql<number>`coalesce(sum(amount), 0)` })
      .from(paymentHistory)
      .where(
        and(
          gte(paymentHistory.createdAt, lastMonthStart),
          sql`created_at <= ${lastMonthEnd}`,
          eq(paymentHistory.status, "succeeded"),
        ),
      );

    const [newSubsThisMonth] = await db
      .select({ cnt: count() })
      .from(subscriptions)
      .where(
        and(
          gte(subscriptions.createdAt, monthStart),
          sql`tier != 'free'`,
        ),
      );

    return reply.send({
      mrr: parseFloat(mrr.toFixed(2)),
      arr: parseFloat((mrr * 12).toFixed(2)),
      activePremium: premiumCount,
      activeExpert: expertCount,
      totalActiveSubscriptions: premiumCount + expertCount,
      freeUsers: subMap["free"] ?? 0,
      totalUsers: Number(totalUsers?.cnt ?? 0),
      revenueThisMonthCents: Number(revenueThisMonth?.total ?? 0),
      revenueLastMonthCents: Number(revenueLastMonth?.total ?? 0),
      newSubscriptionsThisMonth: Number(newSubsThisMonth?.cnt ?? 0),
      currency: "USD",
      asOf: now.toISOString(),
    });
  });

  // ── GET /stats/telemetry ──────────────────────────────────────────────────
  app.get("/stats/telemetry", async (_request, reply) => {
    // Delegate to telemetry analytics aggregations
    const now = new Date();
    const day1ago = new Date(now.getTime() - 86400000);
    const day7ago = new Date(now.getTime() - 7 * 86400000);
    const day30ago = new Date(now.getTime() - 30 * 86400000);

    const [dau] = await db
      .select({ cnt: sql<number>`count(distinct session_id)` })
      .from(telemetryEvents)
      .where(gte(telemetryEvents.createdAt, day1ago));
    const [wau] = await db
      .select({ cnt: sql<number>`count(distinct session_id)` })
      .from(telemetryEvents)
      .where(gte(telemetryEvents.createdAt, day7ago));
    const [mau] = await db
      .select({ cnt: sql<number>`count(distinct session_id)` })
      .from(telemetryEvents)
      .where(gte(telemetryEvents.createdAt, day30ago));

    return reply.send({
      dau: Number(dau?.cnt ?? 0),
      wau: Number(wau?.cnt ?? 0),
      mau: Number(mau?.cnt ?? 0),
      asOf: now.toISOString(),
    });
  });

  // ── GET /machines ─────────────────────────────────────────────────────────
  app.get<{ Querystring: { userId?: string; status?: string; page?: string } }>(
    "/machines",
    async (request, reply) => {
      const page = Math.max(1, parseInt(request.query.page ?? "1", 10));
      const limit = 25;

      const conditions = [];
      if (request.query.userId) conditions.push(eq(machineActivations.userId, request.query.userId));
      if (request.query.status === "active") conditions.push(eq(machineActivations.status, "active"));
      if (request.query.status === "revoked") conditions.push(eq(machineActivations.status, "revoked"));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalRow] = await db.select({ cnt: count() }).from(machineActivations).where(whereClause);

      const machines = await db
        .select({
          id: machineActivations.id,
          userId: machineActivations.userId,
          machineFingerprint: machineActivations.machineFingerprint,
          hostname: machineActivations.hostname,
          osVersion: machineActivations.osVersion,
          appVersion: machineActivations.appVersion,
          status: machineActivations.status,
          activatedAt: machineActivations.activatedAt,
          lastSeenAt: machineActivations.lastSeenAt,
          revokedAt: machineActivations.revokedAt,
        })
        .from(machineActivations)
        .where(whereClause)
        .orderBy(desc(machineActivations.lastSeenAt))
        .limit(limit)
        .offset((page - 1) * limit);

      // Join user emails
      const uids = [...new Set(machines.map((m) => m.userId))];
      const userEmails = uids.length > 0
        ? await db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, uids))
        : [];
      const emailMap = new Map(userEmails.map((u) => [u.id, u.email]));

      return reply.send({
        machines: machines.map((m) => ({ ...m, userEmail: emailMap.get(m.userId) ?? null })),
        total: Number(totalRow?.cnt ?? 0),
        page,
        limit,
      });
    },
  );

  // ── DELETE /machines/:id ──────────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>("/machines/:id", async (request, reply) => {
    const { id } = request.params;

    const [machine] = await db
      .select({ id: machineActivations.id, userId: machineActivations.userId })
      .from(machineActivations)
      .where(eq(machineActivations.id, id))
      .limit(1);

    if (!machine) return reply.code(404).send({ error: "Machine not found" });

    await db
      .update(machineActivations)
      .set({ status: "revoked", revokedAt: new Date() })
      .where(eq(machineActivations.id, id));

    await audit({
      adminId: request.adminId,
      action: "machine.revoke",
      targetUserId: machine.userId,
      targetResourceType: "machine",
      targetResourceId: id,
      details: { machineId: id },
      ipAddress: request.ip,
    });

    return reply.send({ ok: true, revokedMachineId: id });
  });

  // ── GET /audit-log ────────────────────────────────────────────────────────
  app.get<{
    Querystring: {
      page?: string;
      limit?: string;
      adminId?: string;
      action?: string;
      targetUserId?: string;
    };
  }>("/audit-log", async (request, reply) => {
    const page = Math.max(1, parseInt(request.query.page ?? "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(request.query.limit ?? "50", 10)));

    const conditions = [];
    if (request.query.adminId) conditions.push(eq(adminAuditLog.adminId, request.query.adminId));
    if (request.query.targetUserId) conditions.push(eq(adminAuditLog.targetUserId, request.query.targetUserId));
    if (request.query.action) {
      const escapedAction = request.query.action.replace(/[%_\\]/g, "\\$&");
      conditions.push(ilike(adminAuditLog.action, `%${escapedAction}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [totalRow] = await db.select({ cnt: count() }).from(adminAuditLog).where(whereClause);

    const entries = await db
      .select()
      .from(adminAuditLog)
      .where(whereClause)
      .orderBy(desc(adminAuditLog.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return reply.send({
      entries,
      total: Number(totalRow?.cnt ?? 0),
      page,
      limit,
    });
  });
};
