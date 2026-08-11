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
