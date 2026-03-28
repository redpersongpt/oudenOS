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
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'free',
  'pro',
  'enterprise',
]);

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'past_due',
  'cancelled',
  'expired',
  'trialing',
  'incomplete',
]);

export const paymentStatusEnum = pgEnum('payment_status', [
  'succeeded',
  'failed',
  'pending',
  'refunded',
]);

export const oauthProviderEnum = pgEnum('oauth_provider', ['google', 'apple']);

export const machineStatusEnum = pgEnum('machine_status', [
  'active',
  'revoked',
  'expired',
]);

export const auditActionEnum = pgEnum('audit_action', [
  'subscription_override',
  'user_disabled',
  'user_deleted',
  'gift_pro',
  'machine_revoked',
]);

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    passwordHash: text('password_hash'),
    displayName: varchar('display_name', { length: 100 }),
    avatarUrl: text('avatar_url'),
    emailVerified: boolean('email_verified').notNull().default(false),
    emailVerificationToken: text('email_verification_token'),
    emailVerificationExpires: timestamp('email_verification_expires', {
      withTimezone: true,
    }),
    passwordResetToken: text('password_reset_token'),
    passwordResetExpires: timestamp('password_reset_expires', {
      withTimezone: true,
    }),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    role: varchar('role', { length: 10 }).notNull().default('user'),
    isDonor: boolean('is_donor').notNull().default(false),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('users_email_idx').on(t.email)],
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tier: subscriptionTierEnum('tier').notNull().default('free'),
    status: subscriptionStatusEnum('status').notNull().default('active'),
    billingPeriod: varchar('billing_period', { length: 10 }).default(
      'monthly',
    ),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    currentPeriodStart: timestamp('current_period_start', {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    cancelAtPeriodEnd: boolean('cancel_at_period_end')
      .notNull()
      .default(false),
    trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('subscriptions_user_id_idx').on(t.userId)],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('refresh_tokens_user_id_idx').on(t.userId)],
);

export const paymentHistory = pgTable(
  'payment_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', {
      length: 255,
    }),
    stripeInvoiceId: varchar('stripe_invoice_id', { length: 255 }),
    amount: integer('amount').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('usd'),
    status: paymentStatusEnum('status').notNull(),
    tier: subscriptionTierEnum('tier'),
    billingPeriod: varchar('billing_period', { length: 10 }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('payment_history_user_id_idx').on(t.userId)],
);

export const machineActivations = pgTable(
  'machine_activations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    deviceFingerprint: varchar('device_fingerprint', { length: 512 }).notNull(),
    hostname: varchar('hostname', { length: 255 }),
    osVersion: varchar('os_version', { length: 100 }),
    windowsBuild: varchar('windows_build', { length: 50 }),
    machineProfile: varchar('machine_profile', { length: 50 }),
    status: machineStatusEnum('status').notNull().default('active'),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    activatedAt: timestamp('activated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('machine_activations_user_id_idx').on(t.userId),
    index('machine_activations_fingerprint_idx').on(t.deviceFingerprint),
  ],
);

export const connectedAccounts = pgTable(
  'connected_accounts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: oauthProviderEnum('provider').notNull(),
    providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
    providerEmail: varchar('provider_email', { length: 320 }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('connected_accounts_user_id_idx').on(t.userId),
    uniqueIndex('connected_accounts_provider_uid_idx').on(
      t.provider,
      t.providerUserId,
    ),
  ],
);

export const userPreferences = pgTable(
  'user_preferences',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    telemetryEnabled: boolean('telemetry_enabled').notNull().default(true),
    autoUpdate: boolean('auto_update').notNull().default(true),
    notifications: boolean('notifications').notNull().default(true),
    sendEmailUpdates: boolean('send_email_updates').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex('user_preferences_user_id_idx').on(t.userId)],
);

export const telemetryEvents = pgTable(
  'telemetry_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id').notNull(),
    userId: uuid('user_id'),
    event: varchar('event', { length: 64 }).notNull(),
    properties: jsonb('properties'),
    optIn: boolean('opt_in').notNull(),
    clientTimestamp: timestamp('client_timestamp', { withTimezone: true }),
    serverTimestamp: timestamp('server_timestamp', { withTimezone: true })
      .notNull()
      .defaultNow(),
    appVersion: varchar('app_version', { length: 20 }),
    windowsBuild: varchar('windows_build', { length: 50 }),
  },
  (t) => [
    index('telemetry_events_session_id_idx').on(t.sessionId),
    index('telemetry_events_event_idx').on(t.event),
    index('telemetry_events_server_timestamp_idx').on(t.serverTimestamp),
  ],
);

export const adminAuditLog = pgTable(
  'admin_audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    adminId: uuid('admin_id')
      .notNull()
      .references(() => users.id),
    targetUserId: uuid('target_user_id').references(() => users.id),
    action: auditActionEnum('action').notNull(),
    reason: text('reason'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('admin_audit_log_admin_id_idx').on(t.adminId),
    index('admin_audit_log_action_idx').on(t.action),
  ],
);

// ---------------------------------------------------------------------------
// Donations
// ---------------------------------------------------------------------------

export const donationTypeEnum = pgEnum('donation_type', [
  'one_time',
  'monthly',
]);

export const donationStatusEnum = pgEnum('donation_status', [
  'pending',
  'completed',
  'failed',
  'cancelled',
  'refunded',
]);

export const donations = pgTable(
  'donations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    displayName: varchar('display_name', { length: 100 }),
    isPublic: boolean('is_public').notNull().default(true),
    type: donationTypeEnum('type').notNull(),
    status: donationStatusEnum('status').notNull().default('pending'),
    amountCents: integer('amount_cents').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('usd'),
    stripeSessionId: varchar('stripe_session_id', { length: 255 }),
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    message: text('message'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('donations_user_id_idx').on(t.userId),
    index('donations_status_idx').on(t.status),
    index('donations_created_at_idx').on(t.createdAt),
  ],
);

// ---------------------------------------------------------------------------
// Fleet / Enterprise
// ---------------------------------------------------------------------------

export const fleetGroups = pgTable(
  'fleet_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    inviteCode: varchar('invite_code', { length: 32 }).notNull(),
    maxMachines: integer('max_machines').notNull().default(10),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('fleet_groups_invite_code_idx').on(t.inviteCode),
    index('fleet_groups_owner_id_idx').on(t.ownerId),
  ],
);

export const fleetMembers = pgTable(
  'fleet_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => fleetGroups.id, { onDelete: 'cascade' }),
    machineId: uuid('machine_id')
      .notNull()
      .references(() => machineActivations.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('fleet_members_group_id_idx').on(t.groupId),
    index('fleet_members_machine_id_idx').on(t.machineId),
  ],
);
