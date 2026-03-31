import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, subscriptions } from '../db/index.js';
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
// Price map — maps tier+period to Stripe Price IDs from env
// ---------------------------------------------------------------------------

function priceId(tier: string, period: string): string {
  const key = `STRIPE_PRICE_${tier.toUpperCase()}_${period.toUpperCase()}`;
  const id = process.env[key];
  if (!id) throw new Error(`${key} environment variable is required`);
  return id;
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const checkoutSchema = z.object({
  tier: z.enum(['pro', 'enterprise']),
  billingPeriod: z.enum(['monthly', 'annual']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

const cancelSchema = z.object({
  atPeriodEnd: z.boolean(),
});

// ---------------------------------------------------------------------------
// Plan definitions
// ---------------------------------------------------------------------------

const PLANS = [
  {
    tier: 'free',
    name: 'Free',
    description: 'Basic OS health assessment + 3 safe cleanup actions (temp files, browser cache only)',
    features: [
      'Basic health assessment',
      '3 safe cleanup actions',
      'Temp files + browser cache cleanup',
      '1 machine activation',
    ],
    price: { monthly: 0, annual: 0 },
    limits: { machines: 1, transformationActions: 3 },
  },
  {
    tier: 'pro',
    name: 'Pro',
    description: 'Full assessment + all 150+ transformation actions + custom profiles + priority support',
    features: [
      'Full OS health assessment',
      'All 150+ transformation actions',
      'Custom machine profiles',
      'Priority support',
      '3 machine activations',
      'All 8 profile presets',
      'Scheduled transformations',
    ],
    price: { monthly: 900, annual: 7900 },
    limits: { machines: 3, transformationActions: -1 },
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    description: 'Everything + multi-machine (up to 10) + fleet management + API access + white-label',
    features: [
      'Everything in Pro',
      'Up to 10 machine activations',
      'Fleet management dashboard',
      'REST API access',
      'White-label support',
      'Dedicated account manager',
      'Custom transformation policies',
      'Centralized audit logging',
    ],
    price: { monthly: 2900, annual: 24900 },
    limits: { machines: 10, transformationActions: -1 },
  },
] as const;

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default async function subscriptionRoutes(app: FastifyInstance): Promise<void> {
  // -----------------------------------------------------------------------
  // GET /plans (public)
  // -----------------------------------------------------------------------
  app.get('/plans', async (_request, reply) => {
    return reply.send({
      success: true,
      data: {
        plans: PLANS.map((p) => ({
          tier: p.tier,
          name: p.name,
          description: p.description,
          features: p.features,
          price: {
            monthly: p.price.monthly,
            annual: p.price.annual,
            monthlyFormatted: p.price.monthly === 0 ? '$0' : `$${(p.price.monthly / 100).toFixed(0)}/mo`,
            annualFormatted: p.price.annual === 0 ? '$0' : `$${(p.price.annual / 100).toFixed(0)}/yr`,
          },
          limits: p.limits,
        })),
      },
    });
  });

  // -----------------------------------------------------------------------
  // GET /status (auth)
  // -----------------------------------------------------------------------
  app.get('/status', { preHandler: [requireAuth] }, async (request, reply) => {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, request.userId))
      .limit(1);

    if (!sub) {
      return reply.send({
        success: true,
        data: { subscription: { tier: 'free', status: 'active' } },
      });
    }

    return reply.send({ success: true, data: { subscription: sub } });
  });

  // -----------------------------------------------------------------------
  // POST /checkout (auth)
  // -----------------------------------------------------------------------
  app.post('/checkout', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = checkoutSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed', details: parsed.error.flatten() },
      });
    }

    const { tier, billingPeriod, successUrl, cancelUrl } = parsed.data;
    const stripe = getStripe();

    // Get or create Stripe customer
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

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.displayName ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;

      await db
        .update(users)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }

    const appUrl = process.env.APP_URL ?? 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId(tier, billingPeriod), quantity: 1 }],
      success_url: successUrl ?? `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl ?? `${appUrl}/subscription/cancel`,
      metadata: {
        userId: user.id,
        tier,
        billingPeriod,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          tier,
          billingPeriod,
        },
      },
    });

    return reply.send({
      success: true,
      data: { checkoutUrl: session.url, sessionId: session.id },
    });
  });

  // -----------------------------------------------------------------------
  // POST /portal (auth)
  // -----------------------------------------------------------------------
  app.post('/portal', { preHandler: [requireAuth] }, async (request, reply) => {
    const stripe = getStripe();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!user?.stripeCustomerId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'SUB_001', message: 'No billing account found' },
      });
    }

    const appUrl = process.env.APP_URL ?? 'http://localhost:5173';

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/settings/billing`,
    });

    return reply.send({
      success: true,
      data: { portalUrl: session.url },
    });
  });

  // -----------------------------------------------------------------------
  // POST /cancel (auth)
  // -----------------------------------------------------------------------
  app.post('/cancel', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = cancelSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VAL_001', message: 'Validation failed' },
      });
    }

    const { atPeriodEnd } = parsed.data;
    const stripe = getStripe();

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, request.userId))
      .limit(1);

    if (!sub?.stripeSubscriptionId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'SUB_002', message: 'No active subscription to cancel' },
      });
    }

    if (atPeriodEnd) {
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      await db
        .update(subscriptions)
        .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));
    } else {
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);

      await db
        .update(subscriptions)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, sub.id));
    }

    return reply.send({
      success: true,
      data: { message: atPeriodEnd ? 'Subscription will cancel at period end' : 'Subscription cancelled' },
    });
  });

  // -----------------------------------------------------------------------
  // POST /reactivate (auth)
  // -----------------------------------------------------------------------
  app.post('/reactivate', { preHandler: [requireAuth] }, async (request, reply) => {
    const stripe = getStripe();

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, request.userId))
      .limit(1);

    if (!sub?.stripeSubscriptionId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'SUB_003', message: 'No subscription to reactivate' },
      });
    }

    if (!sub.cancelAtPeriodEnd) {
      return reply.status(400).send({
        success: false,
        error: { code: 'SUB_004', message: 'Subscription is not scheduled for cancellation' },
      });
    }

    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: false, updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));

    return reply.send({
      success: true,
      data: { message: 'Subscription reactivated' },
    });
  });

  // -----------------------------------------------------------------------
  // GET /invoices (auth)
  // -----------------------------------------------------------------------
  app.get('/invoices', { preHandler: [requireAuth] }, async (request, reply) => {
    const stripe = getStripe();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!user?.stripeCustomerId) {
      return reply.send({ success: true, data: { invoices: [] } });
    }

    const invoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 24,
    });

    return reply.send({
      success: true,
      data: {
        invoices: invoices.data.map((inv) => ({
          id: inv.id,
          number: inv.number,
          status: inv.status,
          amount: inv.amount_due,
          currency: inv.currency,
          periodStart: inv.period_start ? new Date(inv.period_start * 1000).toISOString() : null,
          periodEnd: inv.period_end ? new Date(inv.period_end * 1000).toISOString() : null,
          pdfUrl: inv.invoice_pdf,
          hostedUrl: inv.hosted_invoice_url,
          createdAt: new Date(inv.created * 1000).toISOString(),
        })),
      },
    });
  });
}
