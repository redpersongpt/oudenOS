// ─── Unified redcoreECO Database Schema ──────────────────────────────────────
// Single PostgreSQL database shared across web, tuning-api, and os-api.
// No subscriptions. Tuning = one-time $12.99 license. OS = free.

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ─── Enums ──────────────────────────────────────────────────────────────────

export const oauthProviderEnum = pgEnum("oauth_provider", ["google", "apple"]);

export const machineStatusEnum = pgEnum("machine_status", [
  "active",
  "revoked",
  "expired",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "succeeded",
  "failed",
  "pending",
  "refunded",
]);

export const paymentTypeEnum = pgEnum("payment_type", [
  "license",
  "donation",
]);

export const licenseStatusEnum = pgEnum("license_status", [
  "active",
  "revoked",
  "expired",
]);

export const productEnum = pgEnum("product", ["tuning", "os"]);

export const auditActionEnum = pgEnum("audit_action", [
  "license_granted",
  "license_revoked",
  "user_disabled",
  "user_deleted",
  "machine_revoked",
]);

// ─── Users ──────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: text("password_hash"),
    displayName: varchar("display_name", { length: 100 }),
    avatarUrl: text("avatar_url"),
    emailVerified: boolean("email_verified").notNull().default(false),
    emailVerificationToken: text("email_verification_token"),
    emailVerificationExpires: timestamp("email_verification_expires", {
      withTimezone: true,
    }),
    passwordResetToken: text("password_reset_token"),
    passwordResetExpires: timestamp("password_reset_expires", {
      withTimezone: true,
    }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    role: varchar("role", { length: 10 }).notNull().default("user"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    uniqueIndex("users_stripe_customer_idx").on(t.stripeCustomerId),
  ],
);

// ─── OAuth / Connected Accounts ─────────────────────────────────────────────

export const connectedAccounts = pgTable(
  "connected_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: oauthProviderEnum("provider").notNull(),
    providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
    providerEmail: varchar("provider_email", { length: 320 }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("connected_accounts_user_id_idx").on(t.userId),
    uniqueIndex("connected_accounts_provider_uid_idx").on(
      t.provider,
      t.providerUserId,
    ),
  ],
);

// ─── Web Sessions (NextAuth only) ───────────────────────────────────────────

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionToken: text("session_token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("sessions_token_idx").on(t.sessionToken)],
);

// ─── Verification Tokens (NextAuth) ─────────────────────────────────────────

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 320 }).notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("verification_tokens_token_idx").on(t.token)],
);

// ─── Refresh Tokens (Desktop JWT auth) ──────────────────────────────────────

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("refresh_tokens_user_id_idx").on(t.userId),
    uniqueIndex("refresh_tokens_hash_idx").on(t.tokenHash),
  ],
);

// ─── Licenses (One-time Tuning purchases) ───────────────────────────────────

export const licenses = pgTable(
  "licenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    product: productEnum("product").notNull().default("tuning"),
    licenseKey: varchar("license_key", { length: 32 }).notNull(),
    status: licenseStatusEnum("status").notNull().default("active"),
    stripeSessionId: varchar("stripe_session_id", { length: 255 }),
    amountCents: integer("amount_cents").notNull().default(1299),
    machineId: varchar("machine_id", { length: 512 }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("licenses_key_idx").on(t.licenseKey),
    uniqueIndex("licenses_stripe_session_idx").on(t.stripeSessionId),
    index("licenses_user_id_idx").on(t.userId),
  ],
);

// ─── Donations ──────────────────────────────────────────────────────────────

export const donations = pgTable(
  "donations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountCents: integer("amount_cents").notNull(),
    stripeSessionId: varchar("stripe_session_id", { length: 255 }),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("donations_user_id_idx").on(t.userId),
    uniqueIndex("donations_stripe_session_idx").on(t.stripeSessionId),
  ],
);

// ─── Payment History ────────────────────────────────────────────────────────

export const paymentHistory = pgTable(
  "payment_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: paymentTypeEnum("type").notNull(),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", {
      length: 255,
    }),
    stripeSessionId: varchar("stripe_session_id", { length: 255 }),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    status: paymentStatusEnum("status").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("payment_history_user_id_idx").on(t.userId)],
);

// ─── Machine Activations ────────────────────────────────────────────────────

export const machineActivations = pgTable(
  "machine_activations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    product: productEnum("product").notNull(),
    licenseId: uuid("license_id").references(() => licenses.id),
    deviceFingerprint: varchar("device_fingerprint", { length: 512 }).notNull(),
    hostname: varchar("hostname", { length: 255 }),
    osVersion: varchar("os_version", { length: 100 }),
    windowsBuild: varchar("windows_build", { length: 50 }),
    machineProfile: varchar("machine_profile", { length: 50 }),
    status: machineStatusEnum("status").notNull().default("active"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    activatedAt: timestamp("activated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("machine_activations_user_id_idx").on(t.userId),
    index("machine_activations_product_idx").on(t.product),
    index("machine_activations_fingerprint_idx").on(t.deviceFingerprint),
  ],
);

// ─── User Preferences ──────────────────────────────────────────────────────

export const userPreferences = pgTable(
  "user_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    telemetryEnabled: boolean("telemetry_enabled").notNull().default(false),
    autoUpdate: boolean("auto_update").notNull().default(true),
    notifications: boolean("notifications").notNull().default(true),
    sendEmailUpdates: boolean("send_email_updates").notNull().default(false),
    extra: jsonb("extra"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("user_preferences_user_id_idx").on(t.userId)],
);

// ─── Telemetry Events ───────────────────────────────────────────────────────

export const telemetryEvents = pgTable(
  "telemetry_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: uuid("session_id").notNull(),
    userId: uuid("user_id"),
    product: productEnum("product").notNull(),
    event: varchar("event", { length: 64 }).notNull(),
    properties: jsonb("properties"),
    optIn: boolean("opt_in").notNull(),
    clientTimestamp: timestamp("client_timestamp", { withTimezone: true }),
    serverTimestamp: timestamp("server_timestamp", { withTimezone: true })
      .notNull()
      .defaultNow(),
    appVersion: varchar("app_version", { length: 20 }),
    windowsBuild: varchar("windows_build", { length: 50 }),
  },
  (t) => [
    index("telemetry_events_session_id_idx").on(t.sessionId),
    index("telemetry_events_product_idx").on(t.product),
    index("telemetry_events_event_idx").on(t.event),
    index("telemetry_events_timestamp_idx").on(t.serverTimestamp),
  ],
);

// ─── Admin Audit Log ────────────────────────────────────────────────────────

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => users.id),
    targetUserId: uuid("target_user_id").references(() => users.id),
    action: auditActionEnum("action").notNull(),
    reason: text("reason"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("admin_audit_log_admin_id_idx").on(t.adminId),
    index("admin_audit_log_action_idx").on(t.action),
  ],
);
