import { Router } from "express";
import { OpenAI as LLMClient } from "openai";

// Transcripts get their own client: longer timeout, no retries — a download
// endpoint should fail fast rather than stack retries on a slow connection.
const llm = new LLMClient({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120_000,
  maxRetries: 0,
});

export const transcriptsRouter = Router();

// Fetch the raw content of an uploaded call transcript for audit review.
transcriptsRouter.get("/:fileId/raw", async (req, res) => {
  const content = await llm.files.retrieveContent(req.params.fileId);
  res.type("text/plain").send(content);
});
