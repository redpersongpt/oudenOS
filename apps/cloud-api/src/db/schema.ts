// ─── Database Schema — redcore-Tuning Cloud API ───────────────────────────────
// Drizzle ORM + PostgreSQL
// All tables use UUID primary keys with gen_random_uuid().

import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  integer,
  uuid,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const oauthProviderEnum = pgEnum("oauth_provider", ["google", "apple"]);
export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "premium", "expert"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "trialing",
  "past_due",
  "cancelled",
  "expired",
  "incomplete",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "succeeded",
  "failed",
  "pending",
  "refunded",
]);
export const machineStatusEnum = pgEnum("machine_status", ["active", "revoked", "expired"]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    email: text("email").notNull().unique(),
    name: text("name"),
    passwordHash: text("password_hash"),
    emailVerified: boolean("email_verified").notNull().default(false),
    emailVerificationToken: text("email_verification_token"),
    emailVerificationExpiresAt: timestamp("email_verification_expires_at"),
    passwordResetToken: text("password_reset_token"),
    passwordResetExpiresAt: timestamp("password_reset_expires_at"),
    avatarUrl: text("avatar_url"),
    oauthProvider: oauthProviderEnum("oauth_provider"),
    oauthId: text("oauth_id"),
    role: userRoleEnum("role").notNull().default("user"),
    stripeCustomerId: text("stripe_customer_id").unique(),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  },
  (t) => [
    index("users_email_idx").on(t.email),
    index("users_stripe_customer_idx").on(t.stripeCustomerId),
    index("users_oauth_idx").on(t.oauthProvider, t.oauthId),
  ],
);

// ─── Refresh Tokens ───────────────────────────────────────────────────────────
// Raw token is never stored — only a SHA-256 hash.

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => [
    index("refresh_tokens_user_idx").on(t.userId),
    index("refresh_tokens_hash_idx").on(t.tokenHash),
  ],
);

// ─── Subscriptions ────────────────────────────────────────────────────────────

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripePriceId: text("stripe_price_id"),
    tier: subscriptionTierEnum("tier").notNull().default("free"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    billingPeriod: text("billing_period").$type<"monthly" | "annual">().default("monthly"),
    currentPeriodStart: timestamp("current_period_start"),
    currentPeriodEnd: timestamp("current_period_end"),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    cancelledAt: timestamp("cancelled_at"),
    trialEnd: timestamp("trial_end"),
    // Admin-override fields
    manualOverride: boolean("manual_override").notNull().default(false),
    overrideReason: text("override_reason"),
    overrideExpiresAt: timestamp("override_expires_at"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  },
  (t) => [
    index("subscriptions_user_idx").on(t.userId),
    index("subscriptions_stripe_sub_idx").on(t.stripeSubscriptionId),
  ],
);

// ─── Payment History ──────────────────────────────────────────────────────────

export const paymentHistory = pgTable(
  "payment_history",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    stripeInvoiceId: text("stripe_invoice_id").unique(),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    amount: integer("amount").notNull(),       // in smallest currency unit (cents)
    currency: text("currency").notNull().default("usd"),
    status: paymentStatusEnum("status").notNull(),
    description: text("description"),
    invoiceUrl: text("invoice_url"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => [
    index("payment_history_user_idx").on(t.userId),
    index("payment_history_invoice_idx").on(t.stripeInvoiceId),
  ],
);

// ─── Machine Activations ──────────────────────────────────────────────────────

export const machineActivations = pgTable(
  "machine_activations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    machineFingerprint: text("machine_fingerprint").notNull(),
    hostname: text("hostname"),
    osVersion: text("os_version"),
    appVersion: text("app_version"),
    status: machineStatusEnum("status").notNull().default("active"),
    activatedAt: timestamp("activated_at").notNull().default(sql`now()`),
    lastSeenAt: timestamp("last_seen_at").notNull().default(sql`now()`),
    revokedAt: timestamp("revoked_at"),
  },
  (t) => [
    index("machine_activations_user_idx").on(t.userId),
    index("machine_activations_fingerprint_idx").on(t.machineFingerprint),
    uniqueIndex("machine_activations_user_fp_active_idx")
      .on(t.userId, t.machineFingerprint)
      .where(sql`status = 'active'`),
  ],
);

// ─── Telemetry Events ─────────────────────────────────────────────────────────
// Opt-in only. No PII stored — sessionId is an ephemeral random UUID.

export const telemetryEvents = pgTable(
  "telemetry_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    // userId is null for anonymous telemetry; set only if user explicitly opts in
    // to linking telemetry to their account.
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    sessionId: text("session_id").notNull(),
    eventType: text("event_type").notNull(),
    metadata: jsonb("metadata"),
    appVersion: text("app_version"),
    osVersion: text("os_version"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => [
    index("telemetry_events_session_idx").on(t.sessionId),
    index("telemetry_events_type_idx").on(t.eventType),
    index("telemetry_events_created_idx").on(t.createdAt),
  ],
);

// ─── Admin Audit Log ──────────────────────────────────────────────────────────

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    targetUserId: uuid("target_user_id").references(() => users.id),
    targetResourceType: text("target_resource_type"), // "user" | "subscription" | "machine"
    targetResourceId: text("target_resource_id"),
    details: jsonb("details"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => [
    index("audit_log_admin_idx").on(t.adminId),
    index("audit_log_target_user_idx").on(t.targetUserId),
    index("audit_log_created_idx").on(t.createdAt),
  ],
);

// ─── Connected OAuth Accounts ─────────────────────────────────────────────────
// Allows a user to link multiple OAuth providers to one account.

export const connectedAccounts = pgTable(
  "connected_accounts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: oauthProviderEnum("provider").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    providerEmail: text("provider_email"),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex("connected_accounts_provider_idx").on(t.provider, t.providerUserId),
    index("connected_accounts_user_idx").on(t.userId),
  ],
);

// ─── User Preferences ─────────────────────────────────────────────────────────

export const userPreferences = pgTable("user_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  telemetryEnabled: boolean("telemetry_enabled").notNull().default(false),
  autoUpdate: boolean("auto_update").notNull().default(true),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  autoBackup: boolean("auto_backup").notNull().default(true),
  showRiskWarnings: boolean("show_risk_warnings").notNull().default(true),
  expertMode: boolean("expert_mode").notNull().default(false),
  logLevel: text("log_level").$type<"error" | "warn" | "info" | "debug">().default("info"),
  extra: jsonb("extra"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// ─── App Releases ─────────────────────────────────────────────────────────────
// Used by the update-check endpoint to serve version metadata.

export const appReleases = pgTable(
  "app_releases",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    version: text("version").notNull().unique(),        // semver e.g. "1.2.3"
    channel: text("channel").notNull().default("stable"), // "stable" | "beta" | "nightly"
    downloadUrl: text("download_url").notNull(),
    sha256: text("sha256").notNull(),
    size: integer("size"),                              // bytes
    changelogMd: text("changelog_md"),
    criticalUpdate: boolean("critical_update").notNull().default(false),
    minRequiredVersion: text("min_required_version"),   // force upgrade if client < this
    publishedAt: timestamp("published_at").notNull().default(sql`now()`),
    createdAt: timestamp("created_at").notNull().default(sql`now()`),
  },
  (t) => [
    index("app_releases_channel_idx").on(t.channel),
    index("app_releases_published_idx").on(t.publishedAt),
  ],
);

// ─── Type exports ─────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type MachineActivation = typeof machineActivations.$inferSelect;
export type TelemetryEvent = typeof telemetryEvents.$inferSelect;
export type AdminAuditEntry = typeof adminAuditLog.$inferSelect;
export type AppRelease = typeof appReleases.$inferSelect;
