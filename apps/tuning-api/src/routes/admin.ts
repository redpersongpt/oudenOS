// Admin Routes
// All routes require admin JWT. Every mutation is recorded in admin_audit_log.
// DB layer uses pg (postgres) with drizzle-orm. For now, all queries are typed
// stubs that show the shape — swap TODO sections with real drizzle calls.

import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireAdmin, getAdminId } from "../middleware/admin.js";

// Request schemas

const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  displayName: z.string().optional(),
  role: z.enum(["user", "admin"]).optional(),
  disabled: z.boolean().optional(),
});

const SubscriptionOverrideSchema = z.object({
  tier: z.enum(["free", "premium"]),
  status: z.enum(["active", "past_due", "cancelled", "expired", "trialing"]),
  expiresAt: z.string().datetime().nullable().optional(),
  reason: z.string().min(1, "Reason is required for audit log"),
});

const GiftPremiumSchema = z.object({
  durationDays: z.number().int().min(1).max(3650),
  reason: z.string().min(1),
});

// In-memory audit log (replace with DB in production)

interface AdminAuditEntry {
  id: string;
  adminId: string;
  action: string;
  targetType: "user" | "subscription" | "machine";
  targetId: string;
  detail: string;
  timestamp: string;
}

const auditLog: AdminAuditEntry[] = [];

function logAdminAction(
  adminId: string,
  action: string,
  targetType: AdminAuditEntry["targetType"],
  targetId: string,
  detail: string,
): void {
  auditLog.unshift({
    id: crypto.randomUUID(),
    adminId,
    action,
    targetType,
    targetId,
    detail,
    timestamp: new Date().toISOString(),
  });
  // Keep last 10000 entries in memory
  if (auditLog.length > 10000) auditLog.splice(10000);
}

// Mock data stores (replace with Drizzle/PostgreSQL)

interface MockUser {
  id: string;
  email: string;
  displayName: string | null;
  role: "user" | "admin";
  tier: "free" | "premium";
  subscriptionStatus: string;
  expiresAt: string | null;
  createdAt: string;
  disabled: boolean;
  machineCount: number;
}

const mockUsers: MockUser[] = [
  {
    id: "usr_01",
    email: "alice@example.com",
    displayName: "Alice Smith",
    role: "user",
    tier: "premium",
    subscriptionStatus: "active",
    expiresAt: "2027-01-01T00:00:00Z",
    createdAt: "2025-01-15T10:00:00Z",
    disabled: false,
    machineCount: 1,
  },
  {
    id: "usr_02",
    email: "bob@example.com",
    displayName: "Bob Jones",
    role: "user",
    tier: "free",
    subscriptionStatus: "active",
    expiresAt: null,
    createdAt: "2025-03-01T09:00:00Z",
    disabled: false,
    machineCount: 0,
  },
];

// Plugin

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // All admin routes require admin JWT
  app.addHook("preHandler", requireAdmin);

  // GET /admin/users
  app.get<{ Querystring: { page?: string; limit?: string; search?: string } }>(
    "/users",
    async (request) => {
      const page = Math.max(1, parseInt(request.query.page ?? "1", 10));
      const limit = Math.min(100, Math.max(1, parseInt(request.query.limit ?? "25", 10)));
      const search = request.query.search?.toLowerCase() ?? "";

      // TODO: Replace with Drizzle query:
      // SELECT * FROM users WHERE (email ILIKE $search OR display_name ILIKE $search)
      // ORDER BY created_at DESC LIMIT $limit OFFSET $offset
      const filtered = mockUsers.filter(
        (u) =>
          !search ||
          u.email.toLowerCase().includes(search) ||
          (u.displayName?.toLowerCase() ?? "").includes(search),
      );
      const total = filtered.length;
      const items = filtered.slice((page - 1) * limit, page * limit);

      return { users: items, total, page, limit, pages: Math.ceil(total / limit) };
    },
  );

  // GET /admin/users/:id
  app.get<{ Params: { id: string } }>("/users/:id", async (request, reply) => {
    // TODO: SELECT * FROM users WHERE id = $id
    const user = mockUsers.find((u) => u.id === request.params.id);
    if (!user) return reply.code(404).send({ error: "User not found" });
    return user;
  });

  // PATCH /admin/users/:id
  app.patch<{ Params: { id: string }; Body: unknown }>(
    "/users/:id",
    async (request, reply) => {
      const parsed = UpdateUserSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }

      const user = mockUsers.find((u) => u.id === request.params.id);
      if (!user) return reply.code(404).send({ error: "User not found" });

      // TODO: UPDATE users SET ... WHERE id = $id
      Object.assign(user, parsed.data);

      logAdminAction(
        getAdminId(request),
        "user.update",
        "user",
        user.id,
        `Updated fields: ${Object.keys(parsed.data).join(", ")}`,
      );

      return user;
    },
  );

  // DELETE /admin/users/:id
  app.delete<{ Params: { id: string } }>("/users/:id", async (request, reply) => {
    const idx = mockUsers.findIndex((u) => u.id === request.params.id);
    if (idx === -1) return reply.code(404).send({ error: "User not found" });

    const removed = mockUsers.splice(idx, 1)[0]!;
    // TODO: DELETE FROM users WHERE id = $id (soft delete: set disabled=true, deleted_at=NOW())

    logAdminAction(
      getAdminId(request),
      "user.delete",
      "user",
      removed.id,
      `Deleted user ${removed.email}`,
    );

    return { deleted: true, id: removed.id };
  });

  // POST /admin/users/:id/subscription
  app.post<{ Params: { id: string }; Body: unknown }>(
    "/users/:id/subscription",
    async (request, reply) => {
      const parsed = SubscriptionOverrideSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }

      const user = mockUsers.find((u) => u.id === request.params.id);
      if (!user) return reply.code(404).send({ error: "User not found" });

      const prev = { tier: user.tier, status: user.subscriptionStatus };
      user.tier = parsed.data.tier;
      user.subscriptionStatus = parsed.data.status;
      if (parsed.data.expiresAt !== undefined) user.expiresAt = parsed.data.expiresAt;

      // TODO: UPDATE subscriptions SET tier=$tier, status=$status WHERE user_id=$id
      // TODO: Emit license.changed event to connected client if online

      logAdminAction(
        getAdminId(request),
        "subscription.override",
        "subscription",
        user.id,
        `Override: ${prev.tier}/${prev.status} → ${parsed.data.tier}/${parsed.data.status}. Reason: ${parsed.data.reason}`,
      );

      return { success: true, user };
    },
  );

  // POST /admin/users/:id/gift-premium
  app.post<{ Params: { id: string }; Body: unknown }>(
    "/users/:id/gift-premium",
    async (request, reply) => {
      const parsed = GiftPremiumSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }

      const user = mockUsers.find((u) => u.id === request.params.id);
      if (!user) return reply.code(404).send({ error: "User not found" });

      const expiresAt = new Date(
        Date.now() + parsed.data.durationDays * 86400 * 1000,
      ).toISOString();

      user.tier = "premium";
      user.subscriptionStatus = "active";
      user.expiresAt = expiresAt;

      // TODO: INSERT INTO gifted_subscriptions (user_id, granted_by, duration_days, expires_at)
      // TODO: Emit license.changed push to client

      logAdminAction(
        getAdminId(request),
        "subscription.gift",
        "subscription",
        user.id,
        `Gifted ${parsed.data.durationDays}d premium to ${user.email}. Expires ${expiresAt}. Reason: ${parsed.data.reason}`,
      );

      return { success: true, tier: "premium", expiresAt };
    },
  );

  // GET /admin/stats/revenue
  app.get("/stats/revenue", async () => {
    // TODO: Real SQL aggregations against subscriptions + payments tables
    // MRR = SUM(monthly_amount) WHERE status='active'
    // Churn rate = churned_this_month / active_start_of_month * 100
    const premiumUsers = mockUsers.filter(
      (u) => u.tier === "premium" && u.subscriptionStatus === "active",
    );
    const mrr = premiumUsers.length * 9.99;

    return {
      mrr: parseFloat(mrr.toFixed(2)),
      arr: parseFloat((mrr * 12).toFixed(2)),
      activeSubscriptions: premiumUsers.length,
      freeUsers: mockUsers.filter((u) => u.tier === "free").length,
      totalUsers: mockUsers.length,
      churnRatePercent: 2.4,          // TODO: real calculation
      newSubscriptionsThisMonth: 3,   // TODO: real calculation
      churnedThisMonth: 1,            // TODO: real calculation
      revenueThisMonth: parseFloat((mrr * 0.97 + 29.97).toFixed(2)),
      revenueLastMonth: parseFloat((mrr * 0.95 + 19.98).toFixed(2)),
      currency: "USD",
      asOf: new Date().toISOString(),
    };
  });

  // GET /admin/stats/telemetry
  app.get("/stats/telemetry", async () => {
    // TODO: Query telemetry_events table with real aggregations
    return {
      dau: 142,
      wau: 891,
      mau: 2340,
      retentionD7Percent: 68.4,
      retentionD30Percent: 41.2,
      topFeatures: [
        { feature: "hardware_scan", usageCount: 3812, uniqueUsers: 2310 },
        { feature: "full_tuning_engine", usageCount: 2140, uniqueUsers: 890 },
        { feature: "benchmark_lab", usageCount: 1780, uniqueUsers: 760 },
        { feature: "rollback_center", usageCount: 890, uniqueUsers: 432 },
        { feature: "thermal_analysis", usageCount: 670, uniqueUsers: 380 },
      ],
      errorRatePer1k: 1.8,
      topErrors: [
        { code: "SCAN_WMI_TIMEOUT", count: 23 },
        { code: "LICENSE_VALIDATE_NET", count: 17 },
        { code: "EXECUTOR_REG_ACCESS", count: 9 },
      ],
      hardwareDistribution: {
        cpuVendors: { Intel: 58, AMD: 42 },
        gpuVendors: { NVIDIA: 61, AMD: 31, Intel: 8 },
        ramGb: { "8": 12, "16": 45, "32": 31, "64+": 12 },
        windowsBuild: { "22631": 42, "22000": 28, "19045": 22, other: 8 },
      },
      asOf: new Date().toISOString(),
    };
  });

  // GET /admin/machines
  app.get<{ Querystring: { userId?: string; page?: string } }>(
    "/machines",
    async (request) => {
      const page = Math.max(1, parseInt(request.query.page ?? "1", 10));
      const limit = 25;

      // TODO: SELECT device_bindings JOIN users WHERE user_id=$userId ORDER BY last_seen_at DESC
      const machines = mockUsers
        .filter((u) => !request.query.userId || u.id === request.query.userId)
        .flatMap((u) =>
          Array.from({ length: u.machineCount }, (_, i) => ({
            id: `dev_${u.id}_${i}`,
            userId: u.id,
            userEmail: u.email,
            hostname: `DESKTOP-${u.id.toUpperCase()}${i}`,
            deviceFingerprint: `fp_${u.id}_${i}_sha256`,
            boundAt: u.createdAt,
            lastSeenAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
            status: "active" as const,
            windowsBuild: "22631",
          })),
        );

      return {
        machines: machines.slice((page - 1) * limit, page * limit),
        total: machines.length,
        page,
        limit,
      };
    },
  );

  // DELETE /admin/machines/:id
  app.delete<{ Params: { id: string } }>("/machines/:id", async (request) => {
    // TODO: UPDATE device_bindings SET status='revoked', revoked_at=NOW() WHERE id=$id

    logAdminAction(
      getAdminId(request),
      "machine.revoke",
      "machine",
      request.params.id,
      `Revoked machine binding ${request.params.id}`,
    );

    return { revoked: true, id: request.params.id };
  });

  // GET /admin/audit-log
  app.get<{
    Querystring: { page?: string; limit?: string; action?: string; adminId?: string };
  }>("/audit-log", async (request) => {
    const page = Math.max(1, parseInt(request.query.page ?? "1", 10));
    const limit = Math.min(200, Math.max(1, parseInt(request.query.limit ?? "50", 10)));
    const actionFilter = request.query.action?.toLowerCase();
    const adminFilter = request.query.adminId;

    // TODO: SELECT * FROM admin_audit_log WHERE ... ORDER BY timestamp DESC
    let entries = auditLog;
    if (actionFilter) entries = entries.filter((e) => e.action.includes(actionFilter));
    if (adminFilter) entries = entries.filter((e) => e.adminId === adminFilter);

    return {
      entries: entries.slice((page - 1) * limit, page * limit),
      total: entries.length,
      page,
      limit,
    };
  });
};
