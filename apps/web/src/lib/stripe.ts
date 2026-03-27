import Stripe from "stripe";

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    // Return a proxy that throws on use — allows build without key
    return new Proxy({} as Stripe, {
      get(_, prop) {
        if (prop === "then") return undefined;
        throw new Error("STRIPE_SECRET_KEY is not configured");
      },
    });
  }
  return new Stripe(key, {
    // @ts-expect-error -- Stripe SDK types may lag behind installed version
    apiVersion: "2025-04-30.basil",
  });
}

export const stripe = getStripeClient();

export const TUNING_PRICE_CENTS = 1299; // $12.99 one-time
