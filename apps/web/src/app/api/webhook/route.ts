import type Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateLicenseKey } from "@/lib/license";
import { stripe } from "@/lib/stripe";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const product = session.metadata?.product;

  if (!userId || product !== "tuning") {
    return;
  }

  const existing = await prisma.license.findUnique({
    where: { stripeSessionId: session.id },
  });
  if (existing) {
    return;
  }

  await prisma.license.create({
    data: {
      userId,
      product: "tuning",
      licenseKey: generateLicenseKey(),
      status: "active",
      stripeSessionId: session.id,
      amountCents: session.amount_total || 1299,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return jsonError("Missing signature", 400);
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch {
    return jsonError("Invalid signature", 400);
  }

  if (event.type === "checkout.session.completed") {
    await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
  }

  return NextResponse.json({ received: true });
}
