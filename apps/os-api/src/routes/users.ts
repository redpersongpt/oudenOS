import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { eq, and, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  users,
  subscriptions,
  userPreferences,
  machineActivations,
  connectedAccounts,
  refreshTokens,
  paymentHistory,
} from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
});

const changeEmailSchema = z.object({
  newEmail: z.string().email().max(320),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const avatarSchema = z.object({
  dataUrl: z.string().max(2 * 1024 * 1024).refine(
    (val) => val.startsWith('data:image/'),
    { message: 'Must be a data:image/ URL' },
  ),
});

const registerMachineSchema = z.object({
  deviceFingerprint: z.string().min(8).max(512),
  hostname: z.string().max(255).optional(),
  osVersion: z.string().max(100).optional(),
  windowsBuild: z.string().max(50).optional(),
  machineProfile: z.string().max(50).optional(),
});

const connectAccountSchema = z.object({
  provider: z.enum(['google', 'apple']),
  providerUserId: z.string().min(1).max(255),
  providerEmail: z.string().email().max(320).optional(),
  accessToken: z.string().optional(),
});

const updatePreferencesSchema = z.object({
  telemetryEnabled: z.boolean().optional(),
  autoUpdate: z.boolean().optional(),
  notifications: z.boolean().optional(),
  sendEmailUpdates: z.boolean().optional(),
});

const deleteAccountSchema = z.object({
  password: z.string().optional(),
  confirmation: z.literal('DELETE MY ACCOUNT'),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIER_MACHINE_LIMITS: Record<string, number> = {
  free: 1,
  pro: 3,
  enterprise: 10,
};

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default async function userRoutes(app: FastifyInstance): Promise<void> {
  // All routes require auth
  app.addHook('preHandler', requireAuth);

  // -----------------------------------------------------------------------
  // GET /me
  // -----------------------------------------------------------------------
  app.get('/me', async (request, reply) => {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!user || user.deletedAt) {
      return reply.status(404).send({
        success: false,
        error: { code: 'USR_001', message: 'User not found' },
      });
    }

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, request.userId))
      .limit(1);

    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, request.userId))
      .limit(1);

    const accounts = await db
      .select({
        id: connectedAccounts.id,
        provider: connectedAccounts.provider,
        providerEmail: connectedAccounts.providerEmail,
        createdAt: connectedAccounts.createdAt,
      })
      .from(connectedAccounts)
      .where(eq(connectedAccounts.userId, request.userId));

    const machines = await db
      .select()
      .from(machineActivations)
      .where(
        and(
          eq(machineActivations.userId, request.userId),
          eq(machineActivations.status, 'active'),
        ),
      );

    return reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified,
          role: user.role,
          createdAt: user.createdAt,
        },
        subscription: sub
          ? {
              tier: sub.tier,
              status: sub.status,
              billingPeriod: sub.billingPeriod,
              currentPeriodEnd: sub.currentPeriodEnd,
              cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
              trialEndsAt: sub.trialEndsAt,
            }
          : null,
        preferences: prefs ?? null,
        connectedAccounts: accounts,
        machines,
      },
    });
  });

  // -----------------------------------------------------------------------
  // PATCH /me
  // -----------------------------------------------------------------------
  app.patch('/me', async (request, reply) => {
    const parsed = updateProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const [updated] = await db
      .update(users)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(users.id, request.userId))
      .returning();

    return reply.send({
      success: true,
      data: {
        user: {
          id: updated!.id,
          email: updated!.email,
          displayName: updated!.displayName,
          avatarUrl: updated!.avatarUrl,
          emailVerified: updated!.emailVerified,
          role: updated!.role,
          createdAt: updated!.createdAt,
        },
      },
    });
  });

  // -----------------------------------------------------------------------
  // POST /me/email
  // -----------------------------------------------------------------------
  app.post('/me/email', async (request, reply) => {
    const parsed = changeEmailSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const { newEmail, password } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!user || !user.passwordHash) {
      return reply.status(400).send({
        success: false,
        error: { code: 'USR_010', message: 'Cannot change email for OAuth-only account without password' },
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({
        success: false,
        error: { code: 'USR_011', message: 'Invalid password' },
      });
    }

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, newEmail.toLowerCase()))
      .limit(1);

    if (existing) {
      return reply.status(409).send({
        success: false,
        error: { code: 'USR_012', message: 'Email already in use' },
      });
    }

    await db
      .update(users)
      .set({
        email: newEmail.toLowerCase(),
        emailVerified: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, request.userId));

    return reply.send({
      success: true,
      data: { message: 'Email updated. Please verify your new email.' },
    });
  });

  // -----------------------------------------------------------------------
  // POST /me/password
  // -----------------------------------------------------------------------
  app.post('/me/password', async (request, reply) => {
    const parsed = changePasswordSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const { currentPassword, newPassword } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!user || !user.passwordHash) {
      return reply.status(400).send({
        success: false,
        error: { code: 'USR_020', message: 'No password set on this account' },
      });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({
        success: false,
        error: { code: 'USR_021', message: 'Current password is incorrect' },
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, request.userId));

    return reply.send({
      success: true,
      data: { message: 'Password updated' },
    });
  });

  // -----------------------------------------------------------------------
  // POST /me/avatar
  // -----------------------------------------------------------------------
  app.post('/me/avatar', async (request, reply) => {
    const parsed = avatarSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    await db
      .update(users)
      .set({ avatarUrl: parsed.data.dataUrl, updatedAt: new Date() })
      .where(eq(users.id, request.userId));

    return reply.send({
      success: true,
      data: { avatarUrl: parsed.data.dataUrl },
    });
  });

  // -----------------------------------------------------------------------
  // GET /me/machines
  // -----------------------------------------------------------------------
  app.get('/me/machines', async (request, reply) => {
    const machines = await db
      .select()
      .from(machineActivations)
      .where(eq(machineActivations.userId, request.userId));

    return reply.send({ success: true, data: { machines } });
  });

  // -----------------------------------------------------------------------
  // POST /me/machines
  // -----------------------------------------------------------------------
  app.post('/me/machines', async (request, reply) => {
    const parsed = registerMachineSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const { deviceFingerprint, hostname, osVersion, windowsBuild, machineProfile } = parsed.data;

    // Get subscription tier
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, request.userId))
      .limit(1);

    const tier = sub?.tier ?? 'free';
    const limit = TIER_MACHINE_LIMITS[tier] ?? 1;

    // Check if this fingerprint already exists for this user — upsert
    const [existing] = await db
      .select()
      .from(machineActivations)
      .where(
        and(
          eq(machineActivations.userId, request.userId),
          eq(machineActivations.deviceFingerprint, deviceFingerprint),
        ),
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(machineActivations)
        .set({
          hostname: hostname ?? existing.hostname,
          osVersion: osVersion ?? existing.osVersion,
          windowsBuild: windowsBuild ?? existing.windowsBuild,
          machineProfile: machineProfile ?? existing.machineProfile,
          status: 'active',
          lastSeenAt: new Date(),
          revokedAt: null,
        })
        .where(eq(machineActivations.id, existing.id))
        .returning();

      return reply.send({ success: true, data: { machine: updated } });
    }

    // Check active machine count
    const activeMachines = await db
      .select({ id: machineActivations.id })
      .from(machineActivations)
      .where(
        and(
          eq(machineActivations.userId, request.userId),
          eq(machineActivations.status, 'active'),
        ),
      );

    if (activeMachines.length >= limit) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'MACHINE_001',
          message: `Machine limit reached (${limit} for ${tier} tier). Upgrade your plan or deactivate an existing machine.`,
        },
      });
    }

    const [machine] = await db
      .insert(machineActivations)
      .values({
        userId: request.userId,
        deviceFingerprint,
        hostname,
        osVersion,
        windowsBuild,
        machineProfile,
        lastSeenAt: new Date(),
      })
      .returning();

    return reply.status(201).send({ success: true, data: { machine } });
  });

  // -----------------------------------------------------------------------
  // DELETE /me/machines/:machineId
  // -----------------------------------------------------------------------
  app.delete<{ Params: { machineId: string } }>(
    '/me/machines/:machineId',
    async (request, reply) => {
      const { machineId } = request.params;

      const [machine] = await db
        .update(machineActivations)
        .set({ status: 'revoked', revokedAt: new Date() })
        .where(
          and(
            eq(machineActivations.id, machineId),
            eq(machineActivations.userId, request.userId),
          ),
        )
        .returning();

      if (!machine) {
        return reply.status(404).send({
          success: false,
          error: { code: 'MACHINE_002', message: 'Machine not found' },
        });
      }

      return reply.send({ success: true, data: { message: 'Machine revoked' } });
    },
  );

  // -----------------------------------------------------------------------
  // GET /me/connected-accounts
  // -----------------------------------------------------------------------
  app.get('/me/connected-accounts', async (request, reply) => {
    const accounts = await db
      .select({
        id: connectedAccounts.id,
        provider: connectedAccounts.provider,
        providerEmail: connectedAccounts.providerEmail,
        createdAt: connectedAccounts.createdAt,
      })
      .from(connectedAccounts)
      .where(eq(connectedAccounts.userId, request.userId));

    return reply.send({ success: true, data: { connectedAccounts: accounts } });
  });

  // -----------------------------------------------------------------------
  // POST /me/connected-accounts
  // -----------------------------------------------------------------------
  app.post('/me/connected-accounts', async (request, reply) => {
    const parsed = connectAccountSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const { provider, providerUserId, providerEmail, accessToken } = parsed.data;

    // Check if already connected
    const [existing] = await db
      .select()
      .from(connectedAccounts)
      .where(
        and(
          eq(connectedAccounts.userId, request.userId),
          eq(connectedAccounts.provider, provider),
        ),
      )
      .limit(1);

    if (existing) {
      return reply.status(409).send({
        success: false,
        error: { code: 'USR_030', message: `${provider} account already connected` },
      });
    }

    const [account] = await db
      .insert(connectedAccounts)
      .values({
        userId: request.userId,
        provider,
        providerUserId,
        providerEmail,
        accessToken,
      })
      .returning();

    return reply.status(201).send({
      success: true,
      data: {
        connectedAccount: {
          id: account!.id,
          provider: account!.provider,
          providerEmail: account!.providerEmail,
          createdAt: account!.createdAt,
        },
      },
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /me/connected-accounts/:provider
  // -----------------------------------------------------------------------
  app.delete<{ Params: { provider: string } }>(
    '/me/connected-accounts/:provider',
    async (request, reply) => {
      const { provider } = request.params;

      if (provider !== 'google' && provider !== 'apple') {
        return reply.status(400).send({
          success: false,
          error: { code: 'USR_031', message: 'Invalid provider' },
        });
      }

      // Don't allow disconnecting if it's the only auth method
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.userId))
        .limit(1);

      const allAccounts = await db
        .select()
        .from(connectedAccounts)
        .where(eq(connectedAccounts.userId, request.userId));

      if (!user?.passwordHash && allAccounts.length <= 1) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'USR_032',
            message: 'Cannot disconnect the only authentication method. Set a password first.',
          },
        });
      }

      const deleted = await db
        .delete(connectedAccounts)
        .where(
          and(
            eq(connectedAccounts.userId, request.userId),
            eq(connectedAccounts.provider, provider),
          ),
        )
        .returning();

      if (deleted.length === 0) {
        return reply.status(404).send({
          success: false,
          error: { code: 'USR_033', message: 'Connected account not found' },
        });
      }

      return reply.send({ success: true, data: { message: `${provider} account disconnected` } });
    },
  );

  // -----------------------------------------------------------------------
  // GET /me/preferences
  // -----------------------------------------------------------------------
  app.get('/me/preferences', async (request, reply) => {
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, request.userId))
      .limit(1);

    if (!prefs) {
      // Create default prefs if missing
      const [created] = await db
        .insert(userPreferences)
        .values({ userId: request.userId })
        .returning();

      return reply.send({ success: true, data: { preferences: created } });
    }

    return reply.send({ success: true, data: { preferences: prefs } });
  });

  // -----------------------------------------------------------------------
  // PATCH /me/preferences
  // -----------------------------------------------------------------------
  app.patch('/me/preferences', async (request, reply) => {
    const parsed = updatePreferencesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.telemetryEnabled !== undefined) updates.telemetryEnabled = parsed.data.telemetryEnabled;
    if (parsed.data.autoUpdate !== undefined) updates.autoUpdate = parsed.data.autoUpdate;
    if (parsed.data.notifications !== undefined) updates.notifications = parsed.data.notifications;
    if (parsed.data.sendEmailUpdates !== undefined) updates.sendEmailUpdates = parsed.data.sendEmailUpdates;

    const [prefs] = await db
      .update(userPreferences)
      .set(updates)
      .where(eq(userPreferences.userId, request.userId))
      .returning();

    if (!prefs) {
      // Upsert if missing
      const [created] = await db
        .insert(userPreferences)
        .values({ userId: request.userId, ...parsed.data })
        .returning();

      return reply.send({ success: true, data: { preferences: created } });
    }

    return reply.send({ success: true, data: { preferences: prefs } });
  });

  // -----------------------------------------------------------------------
  // GET /me/export
  // -----------------------------------------------------------------------
  app.get('/me/export', async (request, reply) => {
    const [user] = await db.select().from(users).where(eq(users.id, request.userId)).limit(1);
    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.userId, request.userId)).limit(1);
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, request.userId)).limit(1);
    const machines = await db.select().from(machineActivations).where(eq(machineActivations.userId, request.userId));
    const accounts = await db
      .select({
        id: connectedAccounts.id,
        provider: connectedAccounts.provider,
        providerEmail: connectedAccounts.providerEmail,
        createdAt: connectedAccounts.createdAt,
      })
      .from(connectedAccounts)
      .where(eq(connectedAccounts.userId, request.userId));
    const payments = await db.select().from(paymentHistory).where(eq(paymentHistory.userId, request.userId));

    return reply.send({
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        user: user
          ? {
              id: user.id,
              email: user.email,
              displayName: user.displayName,
              emailVerified: user.emailVerified,
              createdAt: user.createdAt,
            }
          : null,
        subscription: sub,
        preferences: prefs,
        machines,
        connectedAccounts: accounts,
        paymentHistory: payments,
      },
    });
  });

  // -----------------------------------------------------------------------
  // DELETE /me
  // -----------------------------------------------------------------------
  app.delete('/me', async (request, reply) => {
    const parsed = deleteAccountSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const { password } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: { code: 'USR_001', message: 'User not found' },
      });
    }

    // If user has a password, verify it
    if (user.passwordHash && password) {
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return reply.status(401).send({
          success: false,
          error: { code: 'USR_040', message: 'Invalid password' },
        });
      }
    }

    // Soft delete
    await db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, request.userId));

    // Revoke all refresh tokens
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(refreshTokens.userId, request.userId), isNull(refreshTokens.revokedAt)),
      );

    // Revoke all machines
    await db
      .update(machineActivations)
      .set({ status: 'revoked', revokedAt: new Date() })
      .where(
        and(
          eq(machineActivations.userId, request.userId),
          eq(machineActivations.status, 'active'),
        ),
      );

    return reply.send({
      success: true,
      data: { message: 'Account scheduled for deletion' },
    });
  });
}
