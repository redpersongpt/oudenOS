import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Stripe from 'stripe';
import { eq, desc, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, donations } from '../db/schema.js';
import { requireAuth } from '../middleware/auth.js';

// ---------------------------------------------------------------------------
// Stripe client
// ---------------------------------------------------------------------------

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is required');
  return new Stripe(key);
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createSchema = z.object({
  amountCents: z.number().int().min(100).max(100_000),
  type: z.enum(['one_time', 'monthly']),
  displayName: z.string().max(100).optional(),
  message: z.string().max(500).optional(),
  isPublic: z.boolean().default(true),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default async function donationRoutes(app: FastifyInstance): Promise<void> {
  // -------------------------------------------------------------------------
  // GET /wall — public wall of fame + aggregate stats
  // -------------------------------------------------------------------------
  app.get('/wall', async (_request, reply) => {
    const recentDonors = await db
      .select({
        id: donations.id,
        displayName: donations.displayName,
        amountCents: donations.amountCents,
        currency: donations.currency,
        type: donations.type,
        message: donations.message,
        createdAt: donations.createdAt,
      })
      .from(donations)
      .where(
        and(
          eq(donations.status, 'completed'),
          eq(donations.isPublic, true),
        ),
      )
      .orderBy(desc(donations.createdAt))
      .limit(50);

    const [stats] = await db
      .select({
        totalRaisedCents: sql<number>`coalesce(sum(${donations.amountCents}), 0)::int`,
        donorCount: sql<number>`count(distinct coalesce(${donations.userId}::text, ${donations.displayName}))::int`,
        totalDonations: sql<number>`count(*)::int`,
      })
      .from(donations)
      .where(eq(donations.status, 'completed'));

    return reply.send({
      success: true,
      data: {
        donors: recentDonors.map((d) => ({
          id: d.id,
          displayName: d.displayName ?? 'Anonymous',
          amountCents: d.amountCents,
          currency: d.currency,
          type: d.type,
          message: d.message ?? null,
          createdAt: d.createdAt,
        })),
        stats: {
          totalRaisedCents: Number(stats?.totalRaisedCents ?? 0),
          donorCount: Number(stats?.donorCount ?? 0),
          totalDonations: Number(stats?.totalDonations ?? 0),
        },
      },
    });
  });

  // -------------------------------------------------------------------------
  // GET /mine — authenticated user's donation history
  // -------------------------------------------------------------------------
  app.get('/mine', { preHandler: [requireAuth] }, async (request, reply) => {
    const userDonations = await db
      .select()
      .from(donations)
      .where(eq(donations.userId, request.userId))
      .orderBy(desc(donations.createdAt))
      .limit(24);

    return reply.send({
      success: true,
      data: { donations: userDonations },
    });
  });

  // -------------------------------------------------------------------------
  // POST /create — Stripe checkout session (one-time or monthly)
  // -------------------------------------------------------------------------
  app.post('/create', async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const { amountCents, type, displayName, message, isPublic, successUrl, cancelUrl } = parsed.data;

    // Optionally attach to authenticated user
    let userId: string | null = null;
    let stripeCustomerId: string | undefined;

    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        // Best-effort: attach to user if token is valid
        await (requireAuth as unknown as (req: typeof request, rep: typeof reply) => Promise<void>)(request, reply);
        userId = request.userId;

        const [user] = await db
          .select({ stripeCustomerId: users.stripeCustomerId })
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        stripeCustomerId = user?.stripeCustomerId ?? undefined;
      } catch {
        // Anonymous donation — proceed without auth
        userId = null;
      }
    }

    const stripe = getStripe();
    const appUrl = process.env.APP_URL ?? 'https://redcoreos.net';

    // Insert a pending donation record
    const [donation] = await db
      .insert(donations)
      .values({
        userId: userId ?? undefined,
        displayName: displayName ?? null,
        isPublic,
        type,
        status: 'pending',
        amountCents,
        currency: 'usd',
        message: message ?? null,
      })
      .returning({ id: donations.id });

    const donationId = donation.id;
    const baseSuccess = successUrl ?? `${appUrl}/donate/thank-you?donation_id=${donationId}`;
    const baseCancel = cancelUrl ?? `${appUrl}/donate?cancelled=true`;

    let session: Stripe.Checkout.Session;

    if (type === 'monthly') {
      // Monthly recurring — use price_data with recurring interval
      session = await stripe.checkout.sessions.create({
        ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'redcore-OS Monthly Support',
                description: 'Monthly donation to support redcore-OS development',
              },
              unit_amount: amountCents,
              recurring: { interval: 'month' },
            },
            quantity: 1,
          },
        ],
        metadata: { donationId, type, displayName: displayName ?? '', isPublic: String(isPublic) },
        subscription_data: { metadata: { donationId, type } },
        success_url: `${baseSuccess}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: baseCancel,
      });
    } else {
      // One-time donation
      session = await stripe.checkout.sessions.create({
        ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'redcore-OS One-Time Donation',
                description: 'Thank you for supporting redcore-OS development',
              },
              unit_amount: amountCents,
            },
            quantity: 1,
          },
        ],
        metadata: { donationId, type, displayName: displayName ?? '', isPublic: String(isPublic) },
        success_url: `${baseSuccess}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: baseCancel,
      });
    }

    // Save session ID
    await db
      .update(donations)
      .set({ stripeSessionId: session.id, updatedAt: new Date() })
      .where(eq(donations.id, donationId));

    return reply.send({
      success: true,
      data: { checkoutUrl: session.url, sessionId: session.id, donationId },
    });
  });

  // -------------------------------------------------------------------------
  // POST /cancel-monthly — cancel a recurring donation subscription
  // -------------------------------------------------------------------------
  app.post('/cancel-monthly', { preHandler: [requireAuth] }, async (request, reply) => {
    const body = request.body as { donationId?: string };
    if (!body?.donationId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'donationId is required' },
      });
    }

    const [donation] = await db
      .select()
      .from(donations)
      .where(
        and(
          eq(donations.id, body.donationId),
          eq(donations.userId, request.userId),
          eq(donations.type, 'monthly'),
        ),
      )
      .limit(1);

    if (!donation) {
      return reply.status(404).send({
        success: false,
        error: { code: 'DON_001', message: 'Monthly donation not found' },
      });
    }

    if (!donation.stripeSubscriptionId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'DON_002', message: 'No active subscription found for this donation' },
      });
    }

    const stripe = getStripe();
    await stripe.subscriptions.cancel(donation.stripeSubscriptionId);

    await db
      .update(donations)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(donations.id, donation.id));

    return reply.send({
      success: true,
      data: { message: 'Monthly donation cancelled' },
    });
  });
}

// ---------------------------------------------------------------------------
// Webhook handlers (called from webhooks.ts)
// ---------------------------------------------------------------------------

export async function handleDonationCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const donationId = session.metadata?.donationId;
  if (!donationId) return;

  const stripeSubId = session.subscription as string | null;

  await db
    .update(donations)
    .set({
      status: 'completed',
      stripeSubscriptionId: stripeSubId ?? undefined,
      updatedAt: new Date(),
    })
    .where(eq(donations.id, donationId));

  // Mark user as donor if attached
  const [donation] = await db
    .select({ userId: donations.userId })
    .from(donations)
    .where(eq(donations.id, donationId))
    .limit(1);

  if (donation?.userId) {
    await db
      .update(users)
      .set({ isDonor: true, updatedAt: new Date() })
      .where(eq(users.id, donation.userId));
  }
}

export async function handleDonationSubscriptionCancelled(
  subscription: Stripe.Subscription,
): Promise<void> {
  const donationId = subscription.metadata?.donationId;
  if (!donationId) return;

  await db
    .update(donations)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(eq(donations.id, donationId));
}
