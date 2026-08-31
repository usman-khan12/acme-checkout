import OpenAI from "openai";

// Shared OpenAI client for the whole service. The support endpoints call the
// API on the hot path of a customer request.
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  maxRetries: 3,
});
