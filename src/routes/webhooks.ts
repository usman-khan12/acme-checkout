import express, { Router } from "express";
import type Stripe from "stripe";
import { stripe } from "../lib/stripe";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export const webhooksRouter = Router();

// Event notifications identify an event by id and type; the payload is fetched
// on demand so we never trust the body for anything but routing.
function summarize(event: Stripe.V2.Core.EventNotification): string {
  return `${event.type} (${event.id})`;
}

// Order-lifecycle events arrive on the v2 event stream. Signature
// verification and parsing happen in one step.
webhooksRouter.post("/stripe", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.header("stripe-signature") ?? "";
  let event: Stripe.V2.Core.EventNotification;
  try {
    event = stripe.parseEventNotification(req.body as Buffer, signature, WEBHOOK_SECRET);
  } catch {
    res.status(400).json({ error: "invalid_signature" });
    return;
  }

  console.log(`[stripe] ${summarize(event)}`);

  if (event.type === "v1.billing.meter.error_report_triggered") {
    await handleMeterError(event);
  }

  res.json({ received: true });
});

// The event carries an auth context rather than the record itself — pull the
// full object before acting on it.
async function handleMeterError(event: Stripe.V2.Core.EventNotification): Promise<void> {
  if (!event.livemode) return;
  console.warn(`[stripe] meter error ${event.id} (reason ${event.reason?.type ?? "none"})`);
}
