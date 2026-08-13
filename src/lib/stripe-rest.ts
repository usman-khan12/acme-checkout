// A few Stripe calls go over raw REST instead of the SDK: the finance export
// runs in a worker that pins an older Stripe client, and mixing two SDK
// versions in one process caused type conflicts. See payouts.ts for the same
// pattern applied to the payout list.

const STRIPE_API = "api.stripe.com";

function authHeaders(): Record<string, string> {
  return {
    authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    "content-type": "application/x-www-form-urlencoded",
  };
}

interface StripeList<T> {
  object: "list";
  data: T[];
  has_more: boolean;
}

interface StripeCharge {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paid: boolean;
  refunded: boolean;
  receipt_email: string | null;
  payment_method_details: { type: string } | null;
}

// Charges for a customer, used by the finance reconciliation export.
export async function chargesForCustomer(
  customerId: string,
  limit = 100,
): Promise<StripeCharge[]> {
  const res = await fetch(
    `https://${STRIPE_API}/v1/charges?customer=${encodeURIComponent(customerId)}&limit=${limit}`,
    { headers: authHeaders() },
  );
  if (!res.ok) throw new Error(`stripe charges: HTTP ${res.status}`);
  const body = (await res.json()) as StripeList<StripeCharge>;
  return body.data;
}

// Issue a partial refund without going through the SDK.
export async function refundCharge(
  chargeId: string,
  amountCents?: number,
): Promise<{ id: string; status: string }> {
  const form = new URLSearchParams({ charge: chargeId, reason: "requested_by_customer" });
  if (amountCents != null) form.set("amount", String(amountCents));
  const res = await fetch(`https://${STRIPE_API}/v1/refunds`, {
    method: "POST",
    headers: authHeaders(),
    body: form.toString(),
  });
  if (!res.ok) throw new Error(`stripe refunds: HTTP ${res.status}`);
  return (await res.json()) as { id: string; status: string };
}

// Confirm a payment intent server-side after a 3DS challenge completes.
export async function confirmIntent(intentId: string): Promise<{ id: string; status: string }> {
  const res = await fetch(
    `https://${STRIPE_API}/v1/payment_intents/${encodeURIComponent(intentId)}/confirm`,
    {
      method: "POST",
      headers: authHeaders(),
      body: new URLSearchParams({ return_url: `${process.env.STOREFRONT_URL}/orders` }).toString(),
    },
  );
  if (!res.ok) throw new Error(`stripe confirm: HTTP ${res.status}`);
  return (await res.json()) as { id: string; status: string };
}

// Customer record for the receipt footer.
export async function customerEmail(customerId: string): Promise<string | null> {
  const res = await fetch(
    `https://${STRIPE_API}/v1/customers/${encodeURIComponent(customerId)}`,
    { headers: authHeaders() },
  );
  if (!res.ok) throw new Error(`stripe customer: HTTP ${res.status}`);
  const body = (await res.json()) as { email: string | null; tax_exempt: string };
  return body.email;
}
