import type { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { subscriptions, paymentHistory, users } from '../db/index.js';
import { sendSubscriptionConfirmationEmail } from '../lib/email.js';
import {
  handleDonationCheckoutCompleted,
  handleDonationSubscriptionCancelled,
} from './donations.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is required');
  return new Stripe(key);
}

function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is required');
  return secret;
}

function tierFromPriceId(priceIdVal: string): 'pro' | 'enterprise' {
  const proMonthly = process.env.STRIPE_PRICE_PRO_MONTHLY;
  const proAnnual = process.env.STRIPE_PRICE_PRO_ANNUAL;
  const entMonthly = process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY;
  const entAnnual = process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL;

  if (priceIdVal === proMonthly || priceIdVal === proAnnual) return 'pro';
  if (priceIdVal === entMonthly || priceIdVal === entAnnual) return 'enterprise';
  return 'pro';
}

function billingPeriodFromPriceId(priceIdVal: string): 'monthly' | 'annual' {
  const proAnnual = process.env.STRIPE_PRICE_PRO_ANNUAL;
  const entAnnual = process.env.STRIPE_PRICE_ENTERPRISE_ANNUAL;

  if (priceIdVal === proAnnual || priceIdVal === entAnnual) return 'annual';
  return 'monthly';
}

function mapStripeStatus(
  status: string,
): 'active' | 'past_due' | 'cancelled' | 'expired' | 'trialing' | 'incomplete' {
  switch (status) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'cancelled';
    case 'unpaid':
      return 'expired';
    case 'trialing':
      return 'trialing';
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete';
    default:
      return 'active';
  }
}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

export default async function webhookRoutes(app: FastifyInstance): Promise<void> {
  // Raw body is required for Stripe signature verification
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => {
      done(null, body);
    },
  );

  // -----------------------------------------------------------------------
  // POST /stripe
  // -----------------------------------------------------------------------
  app.post('/stripe', async (request, reply) => {
    const stripe = getStripe();
    const sig = request.headers['stripe-signature'];

    if (!sig) {
      return reply.status(400).send({
        success: false,
        error: { code: 'WH_001', message: 'Missing Stripe-Signature header' },
      });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        request.body as Buffer,
        sig,
        getWebhookSecret(),
      );
    } catch (err) {
      console.error('[webhook] Signature verification failed:', err);
      return reply.status(400).send({
        success: false,
        error: { code: 'WH_002', message: 'Invalid signature' },
      });
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.metadata?.donationId) {
            await handleDonationCheckoutCompleted(session);
          } else {
            await handleCheckoutCompleted(session);
          }
          break;
        }

        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          if (sub.metadata?.donationId) {
            await handleDonationSubscriptionCancelled(sub);
          } else {
            await handleSubscriptionDeleted(sub);
          }
          break;
        }

        case 'invoice.payment_succeeded':
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        default:
          console.log(`[webhook] Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      console.error(`[webhook] Error handling ${event.type}:`, err);
      return reply.status(500).send({
        success: false,
        error: { code: 'WH_500', message: 'Webhook handler failed' },
      });
    }

    return reply.status(200).send({ received: true });
  });
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('[webhook] checkout.session.completed: missing userId in metadata');
    return;
  }

  const tier = (session.metadata?.tier ?? 'pro') as 'pro' | 'enterprise';
  const billingPeriod = (session.metadata?.billingPeriod ?? 'monthly') as "monthly" | "annual";
  const stripeSubId = session.subscription as string | null;
  const stripeCustomerId = session.customer as string | null;

  // Upsert subscription
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        tier,
        status: 'active',
        billingPeriod,
        stripeSubscriptionId: stripeSubId,
        stripeCustomerId,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values({
      userId,
      tier,
      status: 'active',
      billingPeriod,
      stripeSubscriptionId: stripeSubId,
      stripeCustomerId,
    });
  }

  // Send confirmation email
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (user) {
    sendSubscriptionConfirmationEmail(user.email, tier, billingPeriod).catch((err) => {
      console.error('[email] Subscription confirmation failed:', err);
    });
  }
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.userId;
  if (!userId) return;

  const firstItem = sub.items.data[0];
  const priceIdVal = firstItem?.price?.id;

  const updates: Record<string, unknown> = {
    status: mapStripeStatus(sub.status),
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    currentPeriodStart: new Date(sub.current_period_start * 1000),
    currentPeriodEnd: new Date(sub.current_period_end * 1000),
    updatedAt: new Date(),
  };

  if (priceIdVal) {
    updates.tier = tierFromPriceId(priceIdVal);
    updates.billingPeriod = billingPeriodFromPriceId(priceIdVal);
  }

  if (sub.trial_end) {
    updates.trialEndsAt = new Date(sub.trial_end * 1000);
  }

  await db
    .update(subscriptions)
    .set(updates)
    .where(eq(subscriptions.userId, userId));
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const userId = sub.metadata?.userId;
  if (!userId) return;

  // Downgrade to free
  await db
    .update(subscriptions)
    .set({
      tier: 'free',
      status: 'cancelled',
      stripeSubscriptionId: null,
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.userId, userId));
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string | null;
  if (!customerId) return;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (!user) return;

  await db.insert(paymentHistory).values({
    userId: user.id,
    product: "os",
    type: "subscription",
    stripePaymentIntentId: invoice.payment_intent as string | null,
    stripeInvoiceId: invoice.id,
    amountCents: invoice.amount_paid ?? 0,
    currency: invoice.currency ?? 'usd',
    status: 'succeeded',
  });

  // Ensure subscription is active
  await db
    .update(subscriptions)
    .set({ status: 'active', updatedAt: new Date() })
    .where(eq(subscriptions.userId, user.id));
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string | null;
  if (!customerId) return;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (!user) return;

  await db.insert(paymentHistory).values({
    userId: user.id,
    product: "os",
    type: "subscription",
    stripePaymentIntentId: invoice.payment_intent as string | null,
    stripeInvoiceId: invoice.id,
    amountCents: invoice.amount_due ?? 0,
    currency: invoice.currency ?? 'usd',
    status: 'failed',
  });

  // Mark subscription as past_due
  await db
    .update(subscriptions)
    .set({ status: 'past_due', updatedAt: new Date() })
    .where(eq(subscriptions.userId, user.id));
}
