import Stripe from "stripe";

export interface BillingFailure {
  code: string;
  requestId: string | null;
  retryable: boolean;
}

// Card errors are the customer's problem; rate limits and connection errors
// are ours, so the caller needs to know which bucket it landed in.
const RETRYABLE = new Set(["rate_limit_error", "api_error", "idempotency_error"]);

// Narrow an unknown throw into a Stripe error we can report on.
export function describeStripeFailure(err: unknown): BillingFailure | null {
  if (!(err instanceof Stripe.errors.StripeError)) return null;
  const failure: Stripe.errors.StripeError = err;
  return {
    code: failure.type,
    requestId: failure.requestId ?? null,
    retryable: RETRYABLE.has(failure.type),
  };
}

// Checkout surfaces a plain message; the raw Stripe error never reaches the
// storefront.
export function customerFacingMessage(err: unknown): string {
  const failure = describeStripeFailure(err);
  if (!failure) return "Something went wrong. Please try again.";
  if (failure.code === "card_error") return "That card was declined.";
  return failure.retryable
    ? "Payments are briefly unavailable. Please retry in a moment."
    : "We could not process that payment.";
}
