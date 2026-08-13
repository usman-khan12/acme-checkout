import { Router } from "express";
import { z } from "zod";
import { listSupportChannels, updateOrderAlert, attachPackingSlip } from "../lib/slack-admin";
import { chargesForCustomer, refundCharge, customerEmail } from "../lib/stripe-rest";
import { sendDigestBatch, sendingDomainStatus } from "../lib/notify";

// Ops console endpoints. Everything here is behind the internal VPN, so the
// validation exists to catch our own bad payloads rather than hostile input.

const DigestSchema = z.object({
  // Recipients are validated individually so one bad address names itself in
  // the error instead of failing the whole batch anonymously.
  recipients: z.array(z.string().email()).nonempty(),
  subject: z.string().min(1).max(200),
  bodyHtml: z.string(),
  dashboardUrl: z.string().url(),
});

const RefundSchema = z.object({
  chargeId: z.string().startsWith("ch_"),
  amountCents: z.number().int().positive().optional(),
  requestedBy: z.string().uuid(),
  // Free-form audit annotations the support agent types in.
  annotations: z.record(z.string()),
});

const AlertPatchSchema = z.object({
  channel: z.string(),
  ts: z.string(),
  text: z.string(),
  postedAt: z.string().datetime(),
});

export const opsRouter = Router();

// Send the nightly digest to the ops rota.
opsRouter.post("/digest", async (req, res) => {
  const parsed = DigestSchema.safeParse(req.body);
  if (!parsed.success) {
    // Surface the first problem with its path so the caller can fix it.
    const first = parsed.error.errors[0];
    return res.status(400).json({ error: `${first?.path.join(".")}: ${first?.message}` });
  }
  const status = await sendingDomainStatus(String(process.env.RESEND_DOMAIN_ID));
  if (status !== "verified") {
    return res.status(503).json({ error: `sending domain is ${status}` });
  }
  const ids = await sendDigestBatch(
    parsed.data.recipients,
    parsed.data.subject,
    parsed.data.bodyHtml,
  );
  res.json({ sent: ids.length, ids });
});

// Refund a charge and annotate the audit trail.
opsRouter.post("/refund", async (req, res) => {
  const parsed = RefundSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors.map((e) => e.message).join("; ") });
  }
  const refund = await refundCharge(parsed.data.chargeId, parsed.data.amountCents);
  res.json({ refundId: refund.id, status: refund.status });
});

// Reconciliation view: every charge for a customer plus their billing email.
opsRouter.get("/customers/:id/charges", async (req, res) => {
  const [charges, email] = await Promise.all([
    chargesForCustomer(req.params.id),
    customerEmail(req.params.id),
  ]);
  res.json({
    email,
    charges: charges.map((c) => ({
      id: c.id,
      amount: c.amount,
      currency: c.currency,
      refunded: c.refunded,
      method: c.payment_method_details?.type ?? "unknown",
    })),
  });
});

// Edit an order alert in place as fulfilment progresses.
opsRouter.patch("/alerts", async (req, res) => {
  const parsed = AlertPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "invalid" });
  }
  await updateOrderAlert(parsed.data.channel, parsed.data.ts, parsed.data.text);
  res.status(204).end();
});

// Attach a packing slip to an order thread.
opsRouter.post("/alerts/:channel/slip", async (req, res) => {
  const fileId = await attachPackingSlip(
    req.params.channel,
    String(req.body.threadTs),
    String(req.body.filename),
    String(req.body.content),
  );
  res.json({ fileId });
});

// Channel picker for the support console.
opsRouter.get("/channels", async (_req, res) => {
  res.json({ channels: await listSupportChannels() });
});
