// ─── Subscription Routes ───────────────────────────────────────────────────────
// GET  /plans                 — public pricing list
// GET  /status                — authenticated user's subscription status
// POST /checkout              — create Stripe checkout session
// POST /portal                — create Stripe billing portal session
// POST /cancel                — cancel subscription (at period end or immediate)
// POST /reactivate            — undo cancel_at_period_end
// GET  /invoices              — list invoices (from Stripe)

import type { FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { db, users, subscriptions } from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-02-24.acacia",
});

// Price IDs are configured via environment variables so they can differ between
// test and production Stripe accounts without touching code.
const PRICES = {
  premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? "",
  premium_annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL ?? "",
  expert_monthly: process.env.STRIPE_PRICE_EXPERT_MONTHLY ?? "",
  expert_annual: process.env.STRIPE_PRICE_EXPERT_ANNUAL ?? "",
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Restrict redirect URLs to allowed domains to prevent post-payment phishing.
// ALLOWED_REDIRECT_HOSTS is a comma-separated list (e.g. "redcoreos.net").
const allowedRedirectHosts = (process.env.ALLOWED_REDIRECT_HOSTS ?? "redcoreos.net")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

function isAllowedRedirectUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return allowedRedirectHosts.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const checkoutSchema = z.object({
  tier: z.enum(["premium", "expert"]),
  billingPeriod: z.enum(["monthly", "annual"]),
  successUrl: z.string().url().refine(isAllowedRedirectUrl, "URL must be on an allowed domain").optional(),
  cancelUrl: z.string().url().refine(isAllowedRedirectUrl, "URL must be on an allowed domain").optional(),
});

const cancelSchema = z.object({
  immediately: z.boolean().default(false),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name, stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new Error("User not found");
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name ?? undefined,
    metadata: { userId },
  });

  await db
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return customer.id;
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export const subscriptionRoutes: FastifyPluginAsync = async (app) => {
  // ── GET /plans ────────────────────────────────────────────────────────────
  app.get("/plans", async (_request, reply) => {
    return reply.send({
      plans: [
        {
          tier: "free",
          name: "Free",
          description: "Hardware scanning and basic health overview",
          monthlyPriceCents: 0,
          annualPriceCents: 0,
          annualSavingsPercent: 0,
          features: [
            "Hardware scan & health overview",
            "Basic system info",
            "Community support",
          ],
        },
        {
          tier: "premium",
          name: "Premium",
          description: "Full tuning engine, benchmark lab, and rollback center",
          monthlyPriceCents: 999,
          annualPriceCents: 7990,
          annualSavingsPercent: 33,
          features: [
            "Everything in Free",
            "Full tuning engine",
            "Benchmark lab",
            "Rollback center",
            "1 machine",
            "Email support",
          ],
        },
        {
          tier: "expert",
          name: "Expert",
          description: "Everything in Premium plus OC controls and 3-machine sync",
          monthlyPriceCents: 1999,
          annualPriceCents: 15990,
          annualSavingsPercent: 33,
          features: [
            "Everything in Premium",
            "OC & voltage controls",
            "3 machines",
            "Priority support",
            "Early access",
          ],
        },
      ],
    });
  });

  // ── GET /status ───────────────────────────────────────────────────────────
  app.get("/status", { preHandler: requireAuth }, async (request, reply) => {
    const [sub] = await db
      .select({
        tier: subscriptions.tier,
        status: subscriptions.status,
        billingPeriod: subscriptions.billingPeriod,
        currentPeriodStart: subscriptions.currentPeriodStart,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: subscriptions.cancelAtPeriodEnd,
        manualOverride: subscriptions.manualOverride,
        overrideExpiresAt: subscriptions.overrideExpiresAt,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, request.userId))
      .limit(1);

    if (!sub) {
      return reply.send({ tier: "free", status: "active", subscription: null });
    }

    // Expire manual overrides silently
    if (sub.manualOverride && sub.overrideExpiresAt && sub.overrideExpiresAt < new Date()) {
      await db
        .update(subscriptions)
        .set({ tier: "free", status: "cancelled", manualOverride: false, updatedAt: new Date() })
        .where(eq(subscriptions.userId, request.userId));
      return reply.send({ tier: "free", status: "cancelled", subscription: null });
    }

    return reply.send({ subscription: sub, tier: sub.tier, status: sub.status });
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
      return reply.code(500).send({ error: `Price not configured for ${tier}/${billingPeriod}` });
    }

    const customerId = await getOrCreateStripeCustomer(request.userId);
    const appUrl = process.env.APP_URL ?? "https://redcoreos.net";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl ?? `${appUrl}/subscription?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl ?? `${appUrl}/subscription`,
      // metadata on the session object — read by the checkout.session.completed webhook handler
      metadata: { userId: request.userId },
      subscription_data: {
        // Also propagate to the subscription for reference via customer.subscription.* events
        metadata: { userId: request.userId, tier, billingPeriod },
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
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
      return reply.code(400).send({ error: "No billing account found. Subscribe first." });
    }

    const appUrl = process.env.APP_URL ?? "https://redcoreos.net";
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/subscription`,
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
      .where(
        and(
          eq(subscriptions.userId, request.userId),
          eq(subscriptions.status, "active"),
        ),
      )
      .limit(1);

    if (!sub?.stripeSubscriptionId) {
      return reply.code(400).send({ error: "No active Stripe subscription found" });
    }

    if (parse.data.immediately) {
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
      await db
        .update(subscriptions)
        .set({ status: "cancelled", cancelledAt: new Date(), cancelAtPeriodEnd: false, updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));
    } else {
      await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: true });
      await db
        .update(subscriptions)
        .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));
    }

    return reply.send({ ok: true, cancelledImmediately: parse.data.immediately });
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

    await stripe.subscriptions.update(sub.stripeSubscriptionId, { cancel_at_period_end: false });
    await db
      .update(subscriptions)
      .set({ cancelAtPeriodEnd: false, cancelledAt: null, updatedAt: new Date() })
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

    const invoiceList = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 24,
    });

    return reply.send({
      invoices: invoiceList.data.map((inv) => ({
        id: inv.id,
        amountPaidCents: inv.amount_paid,
        amountDueCents: inv.amount_due,
        currency: inv.currency,
        status: inv.status,
        created: inv.created,
        invoiceUrl: inv.hosted_invoice_url,
        pdfUrl: inv.invoice_pdf,
        number: inv.number,
      })),
    });
  });
};
