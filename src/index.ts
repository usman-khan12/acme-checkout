import express from "express";
import { supportRouter } from "./routes/support";
import { transcriptsRouter } from "./routes/transcripts";
import { checkoutRouter } from "./routes/checkout";
import { webhooksRouter } from "./routes/webhooks";
import { openai } from "./lib/client";
import { TriageAgent } from "./agents/triage";
import { recentPayouts } from "./lib/payouts";

const app = express();

// Webhooks need the raw body for signature verification, so they mount
// before the JSON parser.
app.use("/webhooks", webhooksRouter);
app.use(express.json());

app.use("/support", supportRouter);
app.use("/transcripts", transcriptsRouter);
app.use("/checkout", checkoutRouter);

app.get("/finance/payouts", async (_req, res) => {
  res.json({ payouts: await recentPayouts(50) });
});

const triage = new TriageAgent(openai);
app.post("/triage", async (req, res) => {
  const reply = await triage.run(String(req.body.orderId), String(req.body.message));
  res.json({ reply });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`acme-checkout listening on :${port}`);
});
