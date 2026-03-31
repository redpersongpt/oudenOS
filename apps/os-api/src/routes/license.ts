import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { subscriptions, machineActivations } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LicenseState {
  tier: string;
  status: string;
  maxMachines: number;
  activeMachines: number;
  features: string[];
  expiresAt: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TIER_LIMITS: Record<string, number> = {
  free: 1,
  pro: 3,
  enterprise: 10,
};

const TIER_FEATURES: Record<string, string[]> = {
  free: ['basic_assessment', 'safe_cleanup'],
  pro: [
    'basic_assessment',
    'safe_cleanup',
    'full_assessment',
    'all_transformations',
    'custom_profiles',
    'priority_support',
    'scheduled_transforms',
  ],
  enterprise: [
    'basic_assessment',
    'safe_cleanup',
    'full_assessment',
    'all_transformations',
    'custom_profiles',
    'priority_support',
    'scheduled_transforms',
    'fleet_management',
    'api_access',
    'white_label',
    'custom_policies',
    'audit_logging',
  ],
};

async function buildLicenseState(userId: string): Promise<LicenseState> {
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  const tier = sub?.tier ?? 'free';
  const status = sub?.status ?? 'active';

  const activeMachines = await db
    .select({ id: machineActivations.id })
    .from(machineActivations)
    .where(
      and(
        eq(machineActivations.userId, userId),
        eq(machineActivations.status, 'active'),
      ),
    );

  return {
    tier,
    status,
    maxMachines: TIER_LIMITS[tier] ?? 1,
    activeMachines: activeMachines.length,
    features: TIER_FEATURES[tier] ?? TIER_FEATURES['free']!,
    expiresAt: sub?.currentPeriodEnd?.toISOString() ?? null,
  };
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const validateSchema = z.object({
  licenseKey: z.string().optional(),
  deviceFingerprint: z.string().min(1).max(512),
});

const activateSchema = z.object({
  deviceFingerprint: z.string().min(8).max(512),
  hostname: z.string().max(255).optional(),
});

const deactivateSchema = z.object({
  deviceFingerprint: z.string().min(1).max(512),
});

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default async function licenseRoutes(app: FastifyInstance): Promise<void> {
  // -----------------------------------------------------------------------
  // POST /validate (auth)
  // -----------------------------------------------------------------------
  app.post('/validate', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = validateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const { deviceFingerprint } = parsed.data;

    // Check if this device is activated
    const [machine] = await db
      .select()
      .from(machineActivations)
      .where(
        and(
          eq(machineActivations.userId, request.userId),
          eq(machineActivations.deviceFingerprint, deviceFingerprint),
          eq(machineActivations.status, 'active'),
        ),
      )
      .limit(1);

    const license = await buildLicenseState(request.userId);

    return reply.send({
      success: true,
      data: {
        valid: !!machine && license.status === 'active',
        activated: !!machine,
        license,
      },
    });
  });

  // -----------------------------------------------------------------------
  // POST /activate (auth)
  // -----------------------------------------------------------------------
  app.post('/activate', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = activateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const { deviceFingerprint, hostname } = parsed.data;

    // Get tier limit
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, request.userId))
      .limit(1);

    const tier = sub?.tier ?? 'free';
    const limit = TIER_LIMITS[tier] ?? 1;

    // Check if already activated
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
      // Re-activate
      await db
        .update(machineActivations)
        .set({
          status: 'active',
          hostname: hostname ?? existing.hostname,
          lastSeenAt: new Date(),
          revokedAt: null,
        })
        .where(eq(machineActivations.id, existing.id));

      const license = await buildLicenseState(request.userId);
      return reply.send({ success: true, data: { license, machineId: existing.id } });
    }

    // Check limit
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
          code: 'LIC_001',
          message: `Machine activation limit reached (${limit} for ${tier} tier)`,
        },
      });
    }

    const [machine] = await db
      .insert(machineActivations)
      .values({
        userId: request.userId,
        deviceFingerprint,
        hostname,
        lastSeenAt: new Date(),
      })
      .returning();

    const license = await buildLicenseState(request.userId);

    return reply.status(201).send({
      success: true,
      data: { license, machineId: machine!.id },
    });
  });

  // -----------------------------------------------------------------------
  // POST /deactivate (auth)
  // -----------------------------------------------------------------------
  app.post('/deactivate', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = deactivateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed' },
      });
    }

    const { deviceFingerprint } = parsed.data;

    const [machine] = await db
      .update(machineActivations)
      .set({ status: 'revoked', revokedAt: new Date() })
      .where(
        and(
          eq(machineActivations.userId, request.userId),
          eq(machineActivations.deviceFingerprint, deviceFingerprint),
          eq(machineActivations.status, 'active'),
        ),
      )
      .returning();

    if (!machine) {
      return reply.status(404).send({
        success: false,
        error: { code: 'LIC_002', message: 'No active machine found with this fingerprint' },
      });
    }

    const license = await buildLicenseState(request.userId);

    return reply.send({ success: true, data: { license } });
  });

  // -----------------------------------------------------------------------
  // GET /subscription (auth)
  // -----------------------------------------------------------------------
  app.get('/subscription', { preHandler: [requireAuth] }, async (request, reply) => {
    const license = await buildLicenseState(request.userId);
    return reply.send({ success: true, data: { license } });
  });
}
