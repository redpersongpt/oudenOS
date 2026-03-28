// ─── Subscription Routes ──────────────────────────────────────────────────────

import type { FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, users, subscriptions } from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-02-24.acacia",
});

// Price IDs from environment — set in .env
const PRICES = {
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? "",
  premium_annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL ?? "",
  expert_monthly: process.env.STRIPE_PRICE_EXPERT_MONTHLY ?? "",
  expert_annual: process.env.STRIPE_PRICE_EXPERT_ANNUAL ?? "",
} as const;

const checkoutSchema = z.object({
  tier: z.enum(["premium", "expert"]),
  billingPeriod: z.enum(["monthly", "annual"]),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

const cancelSchema = z.object({
  atPeriodEnd: z.boolean().default(true),
});

async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const [user] = await db
    .select({ id: users.id, email: users.email, displayName: users.displayName, stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new Error("User not found");
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.displayName ?? undefined,
    metadata: { userId },
  });

  await db
    .update(users)
    .set({ stripeCustomerId: customer.id })
    .where(eq(users.id, userId));

  return customer.id;
}

export const subscriptionRoutes: FastifyPluginAsync = async (app) => {
  // ── GET /plans ────────────────────────────────────────────────────────────
  app.get("/plans", async (_request, reply) => {
    return reply.send({
      plans: [
        {
          tier: "free",
          name: "Free",
          description: "Hardware scanning and basic health overview",
          monthlyPrice: 0,
          annualPrice: 0,
          annualSavingsPercent: 0,
        },
        {
          tier: "premium",
          name: "Premium",
          description: "Full tuning engine, benchmark lab, and rollback center",
          monthlyPrice: 999,   // cents
          annualPrice: 7990,   // cents/yr (~$6.66/mo, save 33%)
          annualSavingsPercent: 20,
        },
        {
          tier: "expert",
          name: "Expert",
          description: "Everything in Premium plus OC controls, multi-machine sync, and priority support",
          monthlyPrice: 1999,  // cents
          annualPrice: 15990,  // cents/yr (~$13.33/mo, save 33%)
          annualSavingsPercent: 20,
        },
      ],
    });
  });

  // ── GET /status ───────────────────────────────────────────────────────────
  app.get("/status", { preHandler: requireAuth }, async (request, reply) => {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, request.userId))
      .orderBy(subscriptions.createdAt)
      .limit(1);

    if (!sub) {
      return reply.send({ tier: "free", status: "active", subscription: null });
    }

    return reply.send({
      tier: sub.tier,
      status: sub.status,
      billingPeriod: sub.billingPeriod,
      currentPeriodEnd: sub.currentPeriodEnd,
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    });
  });

  // ── POST /checkout ────────────────────────────────────────────────────────
  app.post("/checkout", { preHandler: requireAuth }, async (request, reply) => {
    const parse = checkoutSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input", details: parse.error.flatten() });
    }
    const { tier, billingPeriod, successUrl, cancelUrl } = parse.data;

    const priceKey = `${tier}_${billingPeriod}` as keyof typeof PRICES;
    const priceId = PRICES[priceKey];
    if (!priceId) {
      return reply.code(500).send({ error: "Price not configured" });
    }

    const customerId = await getOrCreateStripeCustomer(request.userId);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl ?? `${process.env.APP_URL ?? "https://redcoreos.net"}/subscription?success=1`,
      cancel_url: cancelUrl ?? `${process.env.APP_URL ?? "https://redcoreos.net"}/subscription`,
      subscription_data: {
        metadata: { userId: request.userId, tier, billingPeriod },
      },
      allow_promotion_codes: true,
    });

    return reply.send({ checkoutUrl: session.url, sessionId: session.id });
  });

  // ── POST /portal ──────────────────────────────────────────────────────────
  app.post("/portal", { preHandler: requireAuth }, async (request, reply) => {
    const [user] = await db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!user?.stripeCustomerId) {
      return reply.code(400).send({ error: "No billing account found" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.APP_URL ?? "https://redcoreos.net"}/subscription`,
    });

    return reply.send({ portalUrl: session.url });
  });

  // ── POST /cancel ──────────────────────────────────────────────────────────
  app.post("/cancel", { preHandler: requireAuth }, async (request, reply) => {
    const parse = cancelSchema.safeParse(request.body ?? {});
    if (!parse.success) {
      return reply.code(400).send({ error: "Invalid input" });
    }

    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.userId, request.userId), eq(subscriptions.status, "active")))
      .limit(1);

    if (!sub?.stripeSubscriptionId) {
      return reply.code(400).send({ error: "No active subscription found" });
    }

    if (parse.data.atPeriodEnd) {
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      await db
        .update(subscriptions)
        .set({ cancelAtPeriodEnd: true })
        .where(eq(subscriptions.id, sub.id));
    } else {
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
      await db
        .update(subscriptions)
        .set({ status: "cancelled", cancelledAt: new Date(), cancelAtPeriodEnd: false })
        .where(eq(subscriptions.id, sub.id));
    }

    return reply.send({ ok: true, cancelAtPeriodEnd: parse.data.atPeriodEnd });
  });

  // ── POST /reactivate ──────────────────────────────────────────────────────
  app.post("/reactivate", { preHandler: requireAuth }, async (request, reply) => {
    const [sub] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, request.userId))
      .limit(1);

    if (!sub?.stripeSubscriptionId) {
      return reply.code(400).send({ error: "No subscription found" });
    }

    if (!sub.cancelAtPeriodEnd) {
      return reply.code(400).send({ error: "Subscription is not scheduled for cancellation" });
    }

    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: false, cancelledAt: null })
      .where(eq(subscriptions.id, sub.id));

    return reply.send({ ok: true });
  });

  // ── GET /invoices ─────────────────────────────────────────────────────────
  app.get("/invoices", { preHandler: requireAuth }, async (request, reply) => {
    const [user] = await db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, request.userId))
      .limit(1);

    if (!user?.stripeCustomerId) {
      return reply.send({ invoices: [] });
    }

    const invoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 24,
    });

    return reply.send({
      invoices: invoices.data.map((inv) => ({
        id: inv.id,
        amountPaid: inv.amount_paid,
        currency: inv.currency,
        status: inv.status,
        created: inv.created,
        invoiceUrl: inv.hosted_invoice_url,
        pdfUrl: inv.invoice_pdf,
      })),
    });
  });
};
