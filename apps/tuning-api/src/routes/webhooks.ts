// Stripe Webhook Handler

import type { FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, users, subscriptions, paymentHistory } from "../db/index.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-02-24.acacia",
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

function tierFromPriceId(priceId: string): "premium" | "expert" {
  const expert = [
    process.env.STRIPE_PRICE_EXPERT_MONTHLY,
    process.env.STRIPE_PRICE_EXPERT_ANNUAL,
  ];
  return expert.includes(priceId) ? "expert" : "premium";
}

function billingPeriodFromPriceId(priceId: string): "monthly" | "annual" {
  const annual = [
    process.env.STRIPE_PRICE_PREMIUM_ANNUAL,
    process.env.STRIPE_PRICE_EXPERT_ANNUAL,
  ];
  return annual.includes(priceId) ? "annual" : "monthly";
}

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  // Raw body required for Stripe signature verification
  app.post(
    "/stripe",
    { config: { rawBody: true } },
    async (request, reply) => {
      const sig = request.headers["stripe-signature"];
      if (!sig) {
        return reply.code(400).send({ error: "Missing stripe-signature header" });
      }

      let event: Stripe.Event;
      try {
        const raw = ((request as unknown as { rawBody?: Buffer | string }).rawBody) ?? JSON.stringify(request.body);
        event = stripe.webhooks.constructEvent(raw, sig, WEBHOOK_SECRET);
      } catch (err) {
        app.log.warn({ err }, "Stripe webhook signature verification failed");
        return reply.code(400).send({ error: "Webhook signature invalid" });
      }

      app.log.info({ type: event.type, id: event.id }, "Stripe webhook received");

      try {
        await handleStripeEvent(event);
      } catch (err) {
        app.log.error({ err, eventId: event.id, eventType: event.type }, "Stripe webhook handler error");
        // Return 200 to prevent Stripe from retrying for non-transient errors
        return reply.send({ received: true, error: "Handler error logged" });
      }

      return reply.send({ received: true });
    },
  );
};

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") return;

      const customerId = session.customer as string;
      const stripeSubId = session.subscription as string;
      const metadata = session.metadata ?? {};

      const userId = metadata["userId"];
      if (!userId) return;

      const stripeSub = await stripe.subscriptions.retrieve(stripeSubId);
      const priceId = stripeSub.items.data[0]?.price.id ?? "";
      const tier = tierFromPriceId(priceId);
      const billingPeriod = billingPeriodFromPriceId(priceId);

      // Update or create subscription record
      const existing = await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(eq(subscriptions.userId, userId))
        .limit(1);

      const subData = {
        stripeSubscriptionId: stripeSubId,
        stripePriceId: priceId,
        tier,
        status: "active" as const,
        billingPeriod,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        cancelAtPeriodEnd: false,
        updatedAt: new Date(),
      };

      if (existing.length > 0) {
        await db.update(subscriptions).set(subData).where(eq(subscriptions.userId, userId));
      } else {
        await db.insert(subscriptions).values({ userId, ...subData });
      }

      // Ensure stripe customer id is stored on user
      await db
        .update(users)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(users.id, userId));
      break;
    }

    case "customer.subscription.updated": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const customerId = stripeSub.customer as string;

      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);

      if (!user) return;

      const priceId = stripeSub.items.data[0]?.price.id ?? "";
      const tier = tierFromPriceId(priceId);
      const billingPeriod = billingPeriodFromPriceId(priceId);

      await db
        .update(subscriptions)
        .set({
          tier,
          billingPeriod,
          stripePriceId: priceId,
          status: mapStripeStatus(stripeSub.status),
          currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
          cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
          cancelledAt: stripeSub.canceled_at ? new Date(stripeSub.canceled_at * 1000) : null,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, user.id));
      break;
    }

    case "customer.subscription.deleted": {
      const stripeSub = event.data.object as Stripe.Subscription;
      const customerId = stripeSub.customer as string;

      const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.stripeCustomerId, customerId))
        .limit(1);

      if (!user) return;

      await db
        .update(subscriptions)
        .set({
          tier: "free",
          status: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.userId, user.id));
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
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
        .where(eq(subscriptions.userId, user.id))
        .limit(1);

      await db.insert(paymentHistory).values({
        userId: user.id,
        subscriptionId: sub?.id ?? null,
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: invoice.payment_intent as string | null,
        amountCents: invoice.amount_paid,
        currency: invoice.currency,
        status: "succeeded",
        description: invoice.description ?? `Invoice ${invoice.number}`,
        invoiceUrl: invoice.hosted_invoice_url ?? null,
      });

      // Ensure subscription is marked active after successful payment
      if (sub) {
        await db
          .update(subscriptions)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(subscriptions.id, sub.id));
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
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
        .where(eq(subscriptions.userId, user.id))
        .limit(1);

      await db.insert(paymentHistory).values({
        userId: user.id,
        subscriptionId: sub?.id ?? null,
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: invoice.payment_intent as string | null,
        amountCents: invoice.amount_due,
        currency: invoice.currency,
        status: "failed",
        description: `Failed payment for invoice ${invoice.number}`,
        invoiceUrl: invoice.hosted_invoice_url ?? null,
      });

      if (sub) {
        await db
          .update(subscriptions)
          .set({ status: "past_due", updatedAt: new Date() })
          .where(eq(subscriptions.id, sub.id));
      }
      break;
    }

    default:
      break;
  }
}

function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status,
): "active" | "past_due" | "cancelled" | "expired" | "trialing" | "incomplete" {
  switch (stripeStatus) {
    case "active": return "active";
    case "past_due": return "past_due";
    case "canceled": return "cancelled";
    case "trialing": return "trialing";
    case "incomplete": return "incomplete";
    case "incomplete_expired": return "expired";
    case "unpaid": return "past_due";
    default: return "active";
  }
}
