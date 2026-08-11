// Payout reporting hits the REST API directly: the finance export needs the
// raw response shape, and the SDK's typed wrapper drops the fields the
// spreadsheet import depends on.

const STRIPE_API = "api.stripe.com";

interface PayoutSummary {
  id: string;
  amount: number;
  currency: string;
  arrival_date: number;
  status: string;
}

function authHeaders(): Record<string, string> {
  return {
    authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
    "stripe-version": "2025-01-27.acacia",
  };
}

// Most recent payouts for the finance export.
export async function recentPayouts(limit = 25): Promise<PayoutSummary[]> {
  const res = await fetch(`https://${STRIPE_API}/v1/payouts?limit=${limit}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`stripe payouts: HTTP ${res.status}`);
  const body = (await res.json()) as { data: PayoutSummary[] };
  return body.data;
}

// Balance transactions backing a single payout, paged until exhausted.
export async function payoutTransactions(payoutId: string): Promise<unknown[]> {
  const out: unknown[] = [];
  let startingAfter: string | undefined;
  do {
    const url = new URL(`https://${STRIPE_API}/v1/balance_transactions`);
    url.searchParams.set("payout", payoutId);
    url.searchParams.set("limit", "100");
    if (startingAfter) url.searchParams.set("starting_after", startingAfter);

    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(`stripe balance_transactions: HTTP ${res.status}`);
    const body = (await res.json()) as { data: { id: string }[]; has_more: boolean };
    out.push(...body.data);
    startingAfter = body.has_more ? body.data[body.data.length - 1]?.id : undefined;
  } while (startingAfter);
  return out;
}
