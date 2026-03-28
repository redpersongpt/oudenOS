import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const oauthProviderEnum = pgEnum("oauth_provider", ["google", "apple"]);
export const productEnum = pgEnum("product", ["tuning", "os"]);
export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "free",
  "premium",
  "expert",
  "pro",
  "enterprise",
]);
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
export const paymentTypeEnum = pgEnum("payment_type", [
  "subscription",
  "license",
  "donation",
]);
export const machineStatusEnum = pgEnum("machine_status", [
  "active",
  "revoked",
  "expired",
]);
export const licenseStatusEnum = pgEnum("license_status", [
  "active",
  "revoked",
  "expired",
]);
export const donationTypeEnum = pgEnum("donation_type", ["one_time", "monthly"]);
export const donationStatusEnum = pgEnum("donation_status", [
  "pending",
  "completed",
  "failed",
  "cancelled",
  "refunded",
]);
export const updateChannelEnum = pgEnum("update_channel", ["stable", "beta", "nightly"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email", { length: 320 }).notNull(),
    name: varchar("name", { length: 100 }),
    displayName: varchar("display_name", { length: 100 }),
    passwordHash: text("password_hash"),
    emailVerified: boolean("email_verified").notNull().default(false),
    emailVerificationToken: text("email_verification_token"),
    emailVerificationExpiresAt: timestamp("email_verification_expires_at", { withTimezone: true }),
    emailVerificationExpires: timestamp("email_verification_expires", { withTimezone: true }),
    passwordResetToken: text("password_reset_token"),
    passwordResetExpiresAt: timestamp("password_reset_expires_at", { withTimezone: true }),
    passwordResetExpires: timestamp("password_reset_expires", { withTimezone: true }),
    avatarUrl: text("avatar_url"),
    oauthProvider: oauthProviderEnum("oauth_provider"),
    oauthId: text("oauth_id"),
    role: userRoleEnum("role").notNull().default("user"),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    isDonor: boolean("is_donor").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    uniqueIndex("users_stripe_customer_idx").on(t.stripeCustomerId),
    index("users_oauth_idx").on(t.oauthProvider, t.oauthId),
  ],
);

export const connectedAccounts = pgTable(
  "connected_accounts",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: oauthProviderEnum("provider").notNull(),
    providerUserId: varchar("provider_user_id", { length: 255 }).notNull(),
    providerEmail: varchar("provider_email", { length: 320 }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("connected_accounts_provider_uid_idx").on(t.provider, t.providerUserId),
    index("connected_accounts_user_idx").on(t.userId),
  ],
);

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

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: varchar("identifier", { length: 320 }).notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("verification_tokens_token_idx").on(t.token)],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("refresh_tokens_hash_idx").on(t.tokenHash),
    index("refresh_tokens_user_idx").on(t.userId),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    product: productEnum("product").notNull().default("tuning"),
    stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    stripePriceId: varchar("stripe_price_id", { length: 255 }),
    tier: subscriptionTierEnum("tier").notNull().default("free"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    billingPeriod: varchar("billing_period", { length: 10 }).$type<"monthly" | "annual">().default("monthly"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
    manualOverride: boolean("manual_override").notNull().default(false),
    overrideReason: text("override_reason"),
    overrideExpiresAt: timestamp("override_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("subscriptions_user_idx").on(t.userId),
    index("subscriptions_product_idx").on(t.product),
    uniqueIndex("subscriptions_stripe_subscription_idx").on(t.stripeSubscriptionId),
  ],
);

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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("licenses_key_idx").on(t.licenseKey),
    uniqueIndex("licenses_stripe_session_idx").on(t.stripeSessionId),
    index("licenses_user_idx").on(t.userId),
  ],
);

export const paymentHistory = pgTable(
  "payment_history",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    product: productEnum("product").notNull().default("tuning"),
    type: paymentTypeEnum("type").notNull().default("subscription"),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    stripeInvoiceId: varchar("stripe_invoice_id", { length: 255 }),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
    stripeSessionId: varchar("stripe_session_id", { length: 255 }),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    status: paymentStatusEnum("status").notNull(),
    description: text("description"),
    invoiceUrl: text("invoice_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("payment_history_user_idx").on(t.userId),
    index("payment_history_product_idx").on(t.product),
    uniqueIndex("payment_history_invoice_idx").on(t.stripeInvoiceId),
  ],
);

export const machineActivations = pgTable(
  "machine_activations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    product: productEnum("product").notNull().default("tuning"),
    licenseId: uuid("license_id").references(() => licenses.id),
    deviceFingerprint: varchar("device_fingerprint", { length: 512 }).notNull(),
    hostname: varchar("hostname", { length: 255 }),
    osVersion: varchar("os_version", { length: 100 }),
    windowsBuild: varchar("windows_build", { length: 50 }),
    appVersion: varchar("app_version", { length: 50 }),
    machineProfile: varchar("machine_profile", { length: 50 }),
    status: machineStatusEnum("status").notNull().default("active"),
    activatedAt: timestamp("activated_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("machine_activations_user_idx").on(t.userId),
    index("machine_activations_product_idx").on(t.product),
    index("machine_activations_fingerprint_idx").on(t.deviceFingerprint),
  ],
);

export const userPreferences = pgTable(
  "user_preferences",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    telemetryEnabled: boolean("telemetry_enabled").notNull().default(false),
    autoUpdate: boolean("auto_update").notNull().default(true),
    notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
    notifications: boolean("notifications").notNull().default(true),
    autoBackup: boolean("auto_backup").notNull().default(true),
    sendEmailUpdates: boolean("send_email_updates").notNull().default(false),
    showRiskWarnings: boolean("show_risk_warnings").notNull().default(true),
    expertMode: boolean("expert_mode").notNull().default(false),
    logLevel: text("log_level").$type<"error" | "warn" | "info" | "debug">().default("info"),
    extra: jsonb("extra"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const telemetryEvents = pgTable(
  "telemetry_events",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    sessionId: text("session_id").notNull(),
    product: productEnum("product").notNull().default("tuning"),
    eventType: varchar("event_type", { length: 64 }).notNull(),
    metadata: jsonb("metadata"),
    optIn: boolean("opt_in").notNull().default(true),
    appVersion: varchar("app_version", { length: 50 }),
    osVersion: varchar("os_version", { length: 100 }),
    windowsBuild: varchar("windows_build", { length: 50 }),
    clientTimestamp: timestamp("client_timestamp", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("telemetry_events_session_idx").on(t.sessionId),
    index("telemetry_events_product_idx").on(t.product),
    index("telemetry_events_type_idx").on(t.eventType),
    index("telemetry_events_created_idx").on(t.createdAt),
  ],
);

export const adminAuditLog = pgTable(
  "admin_audit_log",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    adminId: uuid("admin_id")
      .notNull()
      .references(() => users.id),
    action: text("action").notNull(),
    targetUserId: uuid("target_user_id").references(() => users.id),
    targetResourceType: varchar("target_resource_type", { length: 64 }),
    targetResourceId: varchar("target_resource_id", { length: 255 }),
    reason: text("reason"),
    details: jsonb("details"),
    metadata: jsonb("metadata"),
    ipAddress: varchar("ip_address", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("admin_audit_log_admin_idx").on(t.adminId),
    index("admin_audit_log_target_user_idx").on(t.targetUserId),
    index("admin_audit_log_created_idx").on(t.createdAt),
  ],
);

export const donations = pgTable(
  "donations",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    product: productEnum("product").notNull().default("os"),
    displayName: varchar("display_name", { length: 100 }),
    isPublic: boolean("is_public").notNull().default(true),
    type: donationTypeEnum("type").notNull(),
    status: donationStatusEnum("status").notNull().default("pending"),
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("usd"),
    stripeSessionId: varchar("stripe_session_id", { length: 255 }),
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
    message: text("message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("donations_user_idx").on(t.userId),
    index("donations_product_idx").on(t.product),
    index("donations_status_idx").on(t.status),
    index("donations_created_idx").on(t.createdAt),
    uniqueIndex("donations_session_idx").on(t.stripeSessionId),
  ],
);

export const fleetGroups = pgTable(
  "fleet_groups",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    product: productEnum("product").notNull().default("os"),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    inviteCode: varchar("invite_code", { length: 32 }).notNull(),
    maxMachines: integer("max_machines").notNull().default(10),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("fleet_groups_invite_code_idx").on(t.inviteCode),
    index("fleet_groups_owner_idx").on(t.ownerId),
  ],
);

export const fleetMembers = pgTable(
  "fleet_members",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    groupId: uuid("group_id")
      .notNull()
      .references(() => fleetGroups.id, { onDelete: "cascade" }),
    machineId: uuid("machine_id")
      .notNull()
      .references(() => machineActivations.id, { onDelete: "cascade" }),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("fleet_members_group_idx").on(t.groupId),
    index("fleet_members_machine_idx").on(t.machineId),
  ],
);

export const appReleases = pgTable(
  "app_releases",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    product: productEnum("product").notNull().default("tuning"),
    version: varchar("version", { length: 32 }).notNull(),
    channel: updateChannelEnum("channel").notNull().default("stable"),
    downloadUrl: text("download_url").notNull(),
    sha256: varchar("sha256", { length: 64 }).notNull(),
    size: integer("size"),
    changelogMd: text("changelog_md"),
    criticalUpdate: boolean("critical_update").notNull().default(false),
    minRequiredVersion: varchar("min_required_version", { length: 32 }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("app_releases_product_version_channel_idx").on(t.product, t.version, t.channel),
    index("app_releases_product_channel_idx").on(t.product, t.channel),
    index("app_releases_published_idx").on(t.publishedAt),
  ],
);
