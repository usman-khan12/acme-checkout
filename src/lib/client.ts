import { Agent } from "node:https";
import OpenAI from "openai";

// Shared OpenAI client for the whole service. Keep-alive matters here: the
// support endpoints call the API on the hot path of a customer request.
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  fetchOptions: { agent: new Agent({ keepAlive: true }) } as any,
  maxRetries: 3,
});
