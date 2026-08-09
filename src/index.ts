import express from "express";
import { supportRouter } from "./routes/support";
import { transcriptsRouter } from "./routes/transcripts";
import { openai } from "./lib/client";
import { TriageAgent } from "./agents/triage";

const app = express();
app.use(express.json());

app.use("/support", supportRouter);
app.use("/transcripts", transcriptsRouter);

const triage = new TriageAgent(openai);
app.post("/triage", async (req, res) => {
  const reply = await triage.run(String(req.body.orderId), String(req.body.message));
  res.json({ reply });
});

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
  console.log(`acme-checkout listening on :${port}`);
});
