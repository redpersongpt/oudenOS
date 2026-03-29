// ─── Stripe Webhook Handler ────────────────────────────────────────────────────
// POST /stripe  — receives and processes Stripe events
//
// Handled events:
//   checkout.session.completed
//   customer.subscription.updated
//   customer.subscription.deleted
//   invoice.payment_succeeded
//   invoice.payment_failed

import type { FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { and, eq } from "drizzle-orm";
import { db, users, subscriptions, paymentHistory } from "../db/index.js";
import {
  handleDonationCheckoutCompleted,
  handleDonationSubscriptionCancelled,
} from "./donations.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-02-24.acacia",
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const SUBSCRIPTION_PRODUCT = "tuning" as const;

// ─── Status mapping ───────────────────────────────────────────────────────────

function mapStripeStatus(
  s: Stripe.Subscription.Status,
): "active" | "past_due" | "cancelled" | "expired" | "trialing" | "incomplete" {
  switch (s) {
    case "active":             return "active";
    case "trialing":           return "trialing";
    case "past_due":           return "past_due";
    case "canceled":           return "cancelled";
    case "incomplete":         return "incomplete";
    case "incomplete_expired": return "expired";
    case "unpaid":             return "past_due";
    default:                   return "active";
  }
}

function tierFromPriceId(priceId: string): "premium" | "expert" {
  const expertPrices = [
    process.env.STRIPE_PRICE_EXPERT_MONTHLY,
    process.env.STRIPE_PRICE_EXPERT_ANNUAL,
  ].filter(Boolean);
  return expertPrices.includes(priceId) ? "expert" : "premium";
}

function billingPeriodFromPriceId(priceId: string): "monthly" | "annual" {
  const annualPrices = [
    process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
    process.env.STRIPE_PRICE_EXPERT_ANNUAL,
  ].filter(Boolean);
  return annualPrices.includes(priceId) ? "annual" : "monthly";
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (session.metadata?.["donationId"]) {
    await handleDonationCheckoutCompleted(session);
    return;
  }
  if (session.mode !== "subscription") return;

  const customerId = session.customer as string;
  const stripeSubId = session.subscription as string;

  // Resolve userId: session metadata → subscription metadata → DB lookup by customerId.
  // Stripe may deliver checkout.session.completed with empty session.metadata in some
  // edge cases (e.g. expired sessions replayed), so we always have a fallback chain.
  let userId = session.metadata?.["userId"];

  if (!userId) {
    const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
    userId = stripeSub.metadata?.["userId"];
  }

  if (!userId && customerId) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.stripeCustomerId, customerId))
      .limit(1);
    userId = user?.id;
  }

  if (!userId) return;

  const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
  const priceId = stripeSub.items.data[0]?.price.id ?? "";
  const tier = tierFromPriceId(priceId);
  const billingPeriod = billingPeriodFromPriceId(priceId);

  const subData = {
    product: SUBSCRIPTION_PRODUCT,
    stripeSubscriptionId: stripeSubId,
    stripeCustomerId: customerId,
    stripePriceId: priceId,
    tier,
    status: "active" as const,
    billingPeriod,
    currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
    currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
    cancelAtPeriodEnd: false,
    updatedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.product, SUBSCRIPTION_PRODUCT),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(subscriptions)
      .set(subData)
      .where(and(eq(subscriptions.userId, userId), eq(subscriptions.product, SUBSCRIPTION_PRODUCT)));
  } else {
    await db.insert(subscriptions).values({ userId, ...subData });
  }

  await db
    .update(users)
    .set({ stripeCustomerId: customerId, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

async function handleSubscriptionUpdated(stripeSub: Stripe.Subscription): Promise<void> {
  const [sub] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.stripeSubscriptionId, stripeSub.id),
        eq(subscriptions.product, SUBSCRIPTION_PRODUCT),
      ),
    )
    .limit(1);
  if (!sub) return;

  const priceId = stripeSub.items.data[0]?.price.id ?? "";

  await db
    .update(subscriptions)
    .set({
      tier: tierFromPriceId(priceId),
      billingPeriod: billingPeriodFromPriceId(priceId),
      stripePriceId: priceId,
      status: mapStripeStatus(stripeSub.status),
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));
}

async function handleSubscriptionDeleted(stripeSub: Stripe.Subscription): Promise<void> {
  if (stripeSub.metadata?.["donationId"]) {
    await handleDonationSubscriptionCancelled(stripeSub);
    return;
  }
  const [sub] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.stripeSubscriptionId, stripeSub.id),
        eq(subscriptions.product, SUBSCRIPTION_PRODUCT),
      ),
    )
    .limit(1);
  if (!sub) return;

  await db
    .update(subscriptions)
    .set({
      tier: "free",
      status: "cancelled",
      cancelledAt: new Date(),
      stripeSubscriptionId: null,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));
}

async function handleInvoiceSucceeded(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (!user) return;

  const [sub] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.product, SUBSCRIPTION_PRODUCT)))
    .limit(1);

  // Insert payment record (idempotent via unique stripeInvoiceId)
  await db
    .insert(paymentHistory)
    .values({
      userId: user.id,
      subscriptionId: sub?.id ?? null,
      product: SUBSCRIPTION_PRODUCT,
      type: "subscription",
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: invoice.payment_intent as string | null,
      amountCents: invoice.amount_paid,
      currency: invoice.currency,
      status: "succeeded",
      description: invoice.description ?? `Invoice ${invoice.number ?? ""}`.trim(),
      invoiceUrl: invoice.hosted_invoice_url ?? null,
    })
    .onConflictDoNothing();

  // Ensure subscription shows active after successful payment
  if (sub) {
    await db
      .update(subscriptions)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));
  }
}

async function handleInvoiceFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.stripeCustomerId, customerId))
    .limit(1);

  if (!user) return;

  const [sub] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, user.id), eq(subscriptions.product, SUBSCRIPTION_PRODUCT)))
    .limit(1);

  await db
    .insert(paymentHistory)
    .values({
      userId: user.id,
      subscriptionId: sub?.id ?? null,
      product: SUBSCRIPTION_PRODUCT,
      type: "subscription",
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: invoice.payment_intent as string | null,
      amountCents: invoice.amount_due,
      currency: invoice.currency,
      status: "failed",
      description: `Failed payment for invoice ${invoice.number ?? ""}`.trim(),
      invoiceUrl: invoice.hosted_invoice_url ?? null,
    })
    .onConflictDoNothing();

  if (sub) {
    await db
      .update(subscriptions)
      .set({ status: "past_due", updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));
  }
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  // Raw body is required for Stripe signature verification.
  // The fastify-raw-body plugin stores the raw buffer in request.rawBody
  // when { config: { rawBody: true } } is set on the route.
  app.post(
    "/stripe",
    { config: { rawBody: true } },
    async (request, reply) => {
      const sig = request.headers["stripe-signature"];
      if (!sig) {
        return reply.code(400).send({ error: "Missing stripe-signature header" });
      }
      if (!WEBHOOK_SECRET) {
        app.log.error("STRIPE_WEBHOOK_SECRET is not configured");
        return reply.code(500).send({ error: "Webhook not configured" });
      }

      let event: Stripe.Event;
      try {
        // fastify-raw-body stores as string when encoding:"utf8" is set.
        // Do NOT fall back to JSON.stringify — it cannot guarantee byte-identical
        // output and would silently mask a plugin misconfiguration.
        const rawBody = (request as unknown as { rawBody?: string | Buffer }).rawBody;
        if (!rawBody) {
          app.log.error("rawBody not available — fastify-raw-body plugin may be misconfigured");
          return reply.code(500).send({ error: "Server configuration error" });
        }
        event = stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET);
      } catch (err) {
        app.log.warn({ err }, "Stripe webhook signature verification failed");
        return reply.code(400).send({ error: "Webhook signature invalid" });
      }

      app.log.info({ eventId: event.id, eventType: event.type }, "Stripe webhook received");

      try {
        switch (event.type) {
          case "checkout.session.completed":
            await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
            break;
          case "customer.subscription.updated":
            await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
            break;
          case "customer.subscription.deleted":
            await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
            break;
          case "invoice.payment_succeeded":
            await handleInvoiceSucceeded(event.data.object as Stripe.Invoice);
            break;
          case "invoice.payment_failed":
            await handleInvoiceFailed(event.data.object as Stripe.Invoice);
            break;
          default:
            app.log.debug({ eventType: event.type }, "Unhandled Stripe event type");
        }
      } catch (err) {
        // Log but return 200 — Stripe will retry on 5xx.
        // Non-transient errors (bad data) should not cause infinite retries.
        app.log.error({ err, eventId: event.id, eventType: event.type }, "Webhook handler error");
        return reply.send({ received: true, warning: "Handler error logged" });
      }

      return reply.send({ received: true });
    },
  );
};
