import { Router } from "express";
import { z } from "zod";
import { stripe } from "../lib/stripe";
import { customerFacingMessage } from "../lib/billing-errors";

const CartSchema = z.object({
  priceId: z.string(),
  quantity: z.number().int().positive().max(50),
  customerEmail: z.string().email(),
});

export const checkoutRouter = Router();

// Start a hosted checkout for a storefront cart.
checkoutRouter.post("/session", async (req, res) => {
  const cart = CartSchema.parse(req.body);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: cart.priceId, quantity: cart.quantity }],
      customer_email: cart.customerEmail,
      success_url: `${process.env.STOREFRONT_URL}/orders/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.STOREFRONT_URL}/cart`,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(402).json({ error: customerFacingMessage(err) });
  }
});

// Support-initiated refunds. Amount is optional — omitting it refunds in full.
checkoutRouter.post("/refund", async (req, res) => {
  const paymentIntent = String(req.body.paymentIntent);
  const amount = req.body.amount == null ? undefined : Number(req.body.amount);
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntent,
      amount,
      reason: "requested_by_customer",
    });
    res.json({ refundId: refund.id, status: refund.status });
  } catch (err) {
    res.status(402).json({ error: customerFacingMessage(err) });
  }
});
