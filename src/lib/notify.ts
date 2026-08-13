// Outbound notifications. Both vendors are called over plain HTTP rather
// than through their SDKs — the payloads are small and we did not want two
// more dependencies in the checkout hot path.

const SLACK_API = "slack.com/api";
const RESEND_API = "api.resend.com";

// Post an order alert into the #orders channel.
export async function notifyOrdersChannel(text: string): Promise<void> {
  const res = await fetch(`https://${SLACK_API}/chat.postMessage`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ channel: "#orders", text }),
  });
  const body = (await res.json()) as { ok: boolean; error?: string };
  if (!body.ok) throw new Error(`slack: ${body.error ?? "unknown_error"}`);
}

// Receipt email after a successful checkout.
export async function sendReceipt(to: string, orderId: string): Promise<string> {
  const res = await fetch(`https://${RESEND_API}/emails`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: "receipts@acme.example",
      to,
      subject: `Your Acme order ${orderId}`,
      html: `<p>Thanks for your order. Reference: <strong>${orderId}</strong>.</p>`,
    }),
  });
  if (!res.ok) throw new Error(`resend: HTTP ${res.status}`);
  const body = (await res.json()) as { id: string };
  return body.id;
}

// Nightly digest to the ops rota — one call instead of N.
export async function sendDigestBatch(
  recipients: string[],
  subject: string,
  html: string,
): Promise<string[]> {
  const res = await fetch(`https://${RESEND_API}/emails/batch`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(
      recipients.map((to) => ({ from: "ops@acme.example", to, subject, html })),
    ),
  });
  if (!res.ok) throw new Error(`resend batch: HTTP ${res.status}`);
  const body = (await res.json()) as { data: { id: string }[] };
  return body.data.map((d) => d.id);
}

// Verify the sending domain is still green before the nightly run.
export async function sendingDomainStatus(domainId: string): Promise<string> {
  const res = await fetch(`https://${RESEND_API}/domains/${encodeURIComponent(domainId)}`, {
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  });
  if (!res.ok) throw new Error(`resend domain: HTTP ${res.status}`);
  const body = (await res.json()) as { status: string; region: string };
  return body.status;
}

// Pull a delivered receipt back for the support console's audit trail.
export async function receiptDelivery(emailId: string): Promise<{ last_event: string }> {
  const res = await fetch(`https://${RESEND_API}/emails/${encodeURIComponent(emailId)}`, {
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}` },
  });
  if (!res.ok) throw new Error(`resend receipt: HTTP ${res.status}`);
  return (await res.json()) as { last_event: string };
}
