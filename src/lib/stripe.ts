import Stripe from "stripe";

// Shared Stripe client. The API version is pinned deliberately — billing
// reconciliation compares against fields that moved in later versions, so
// upgrades need a review pass rather than a bare version bump.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-07-29.dahlia",
  maxNetworkRetries: 2,
  timeout: 20_000,
});
