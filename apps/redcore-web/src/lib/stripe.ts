import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  // @ts-expect-error -- Stripe SDK types may lag behind installed version
  apiVersion: "2025-04-30.basil",
});

export const TUNING_PRICE_CENTS = 1299; // $12.99 one-time
