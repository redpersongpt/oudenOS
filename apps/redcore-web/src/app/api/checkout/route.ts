import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe, TUNING_PRICE_CENTS } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const product = body.product || "tuning";

  if (product !== "tuning") {
    return NextResponse.json({ error: "Invalid product" }, { status: 400 });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: session.user.email,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "redcore · Tuning — Premium License",
            description: "One-time purchase. Lifetime license key for one machine.",
          },
          unit_amount: TUNING_PRICE_CENTS,
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: session.user.id || "",
      product: "tuning",
    },
    success_url: `${process.env.NEXTAUTH_URL}/profile?purchased=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/#tuning`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
