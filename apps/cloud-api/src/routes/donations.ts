import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import Stripe from "stripe";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, donations, users } from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";

const createSchema = z.object({
  amountCents: z.number().int().min(100).max(100_000),
  type: z.enum(["one_time", "monthly"]),
  displayName: z.string().max(100).optional(),
  message: z.string().max(500).optional(),
  isPublic: z.boolean().default(true),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is required");
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

export const donationRoutes: FastifyPluginAsync = async (app) => {
  app.get("/wall", async (_request, reply) => {
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
          eq(donations.product, "os"),
          eq(donations.status, "completed"),
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
      .where(and(eq(donations.product, "os"), eq(donations.status, "completed")));

    return reply.send({
      donors: recentDonors.map((donor) => ({
        ...donor,
        displayName: donor.displayName ?? "Anonymous",
        amount: donor.amountCents,
      })),
      stats: {
        totalRaisedCents: Number(stats?.totalRaisedCents ?? 0),
        donorCount: Number(stats?.donorCount ?? 0),
        totalDonations: Number(stats?.totalDonations ?? 0),
      },
    });
  });

  app.get("/mine", { preHandler: requireAuth }, async (request, reply) => {
    const rows = await db
      .select()
      .from(donations)
      .where(and(eq(donations.product, "os"), eq(donations.userId, request.userId)))
      .orderBy(desc(donations.createdAt))
      .limit(24);

    return reply.send({ donations: rows });
  });

  app.post("/create", async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const { amountCents, type, displayName, message, isPublic, successUrl, cancelUrl } = parsed.data;

    let userId: string | null = null;
    let stripeCustomerId: string | undefined;
    const authHeader = request.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      try {
        await (requireAuth as unknown as (req: typeof request, rep: typeof reply) => Promise<void>)(request, reply);
        userId = request.userId;
        const [user] = await db
          .select({ stripeCustomerId: users.stripeCustomerId })
          .from(users)
          .where(eq(users.id, request.userId))
          .limit(1);
        stripeCustomerId = user?.stripeCustomerId ?? undefined;
      } catch {
        userId = null;
      }
    }

    const stripe = getStripe();
    const appUrl = process.env.OS_APP_URL ?? process.env.APP_URL ?? "https://redcoreos.net";
    const [donation] = await db
      .insert(donations)
      .values({
        userId,
        product: "os",
        displayName: displayName ?? null,
        isPublic,
        type,
        status: "pending",
        amountCents,
        currency: "usd",
        message: message ?? null,
      })
      .returning({ id: donations.id });

    const donationId = donation.id;
    const baseSuccess = successUrl ?? `${appUrl}/donate/thank-you?donation_id=${donationId}`;
    const baseCancel = cancelUrl ?? `${appUrl}/donate?cancelled=true`;

    const session = type === "monthly"
      ? await stripe.checkout.sessions.create({
          ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
          mode: "subscription",
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "redcore-OS Monthly Support",
                  description: "Monthly donation to support redcore-OS development",
                },
                unit_amount: amountCents,
                recurring: { interval: "month" },
              },
              quantity: 1,
            },
          ],
          metadata: { donationId, type, product: "os", displayName: displayName ?? "", isPublic: String(isPublic) },
          subscription_data: { metadata: { donationId, type, product: "os" } },
          success_url: `${baseSuccess}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: baseCancel,
        })
      : await stripe.checkout.sessions.create({
          ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
          mode: "payment",
          payment_method_types: ["card"],
          line_items: [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: "redcore-OS One-Time Donation",
                  description: "Thank you for supporting redcore-OS development",
                },
                unit_amount: amountCents,
              },
              quantity: 1,
            },
          ],
          metadata: { donationId, type, product: "os", displayName: displayName ?? "", isPublic: String(isPublic) },
          success_url: `${baseSuccess}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: baseCancel,
        });

    await db
      .update(donations)
      .set({ stripeSessionId: session.id, updatedAt: new Date() })
      .where(eq(donations.id, donationId));

    return reply.send({ checkoutUrl: session.url, sessionId: session.id, donationId });
  });

  app.post("/cancel-monthly", { preHandler: requireAuth }, async (request, reply) => {
    const body = z.object({ donationId: z.string().uuid() }).safeParse(request.body);
    if (!body.success) {
      return reply.code(400).send({ error: "donationId is required" });
    }

    const [donation] = await db
      .select()
      .from(donations)
      .where(
        and(
          eq(donations.id, body.data.donationId),
          eq(donations.product, "os"),
          eq(donations.userId, request.userId),
          eq(donations.type, "monthly"),
        ),
      )
      .limit(1);

    if (!donation) return reply.code(404).send({ error: "Monthly donation not found" });
    if (!donation.stripeSubscriptionId) {
      return reply.code(400).send({ error: "No active subscription found for this donation" });
    }

    const stripe = getStripe();
    await stripe.subscriptions.cancel(donation.stripeSubscriptionId);
    await db
      .update(donations)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(donations.id, donation.id));

    return reply.send({ ok: true });
  });
};

export async function handleDonationCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const donationId = session.metadata?.donationId;
  if (!donationId) return;

  await db
    .update(donations)
    .set({
      status: "completed",
      stripeSubscriptionId: (session.subscription as string | null) ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(donations.id, donationId), eq(donations.product, "os")));

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

export async function handleDonationSubscriptionCancelled(subscription: Stripe.Subscription): Promise<void> {
  const donationId = subscription.metadata?.donationId;
  if (!donationId) return;

  await db
    .update(donations)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(eq(donations.id, donationId), eq(donations.product, "os")));
}
