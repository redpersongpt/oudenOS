import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { generateLicenseKey } from "@/lib/license";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata?.userId;
    const product = session.metadata?.product;

    if (userId && product === "tuning") {
      const licenseKey = generateLicenseKey();

      await prisma.license.create({
        data: {
          userId,
          product: "tuning",
          licenseKey,
          status: "active",
          stripeSessionId: session.id,
          amountCents: session.amount_total || 1299,
        },
      });
    }
  }

  return NextResponse.json({ received: true });
}
