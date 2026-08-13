import Anthropic from "@anthropic-ai/sdk";

// Support-ticket summarizer. Runs on the nightly digest path, not in the
// request path, so a slow model is acceptable here.
const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 2,
});

export interface TicketSummary {
  headline: string;
  sentiment: "angry" | "neutral" | "pleased";
}

// Condense a support thread into one line for the ops digest.
export async function summarizeThread(messages: string[]): Promise<string> {
  const response = await claude.completions.create({
    model: "claude-2.1",
    max_tokens_to_sample: 300,
    prompt: `\n\nHuman: Summarize this support thread in one sentence:\n${messages.join(
      "\n",
    )}\n\nAssistant:`,
  });
  return response.completion.trim();
}

// Classify the customer's tone so the rota can triage the angry ones first.
export async function classifyTone(thread: string): Promise<TicketSummary> {
  const message = await claude.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: `Classify the tone of this support thread as angry, neutral, or pleased, then give a one-line headline.\n\n${thread}`,
      },
    ],
  });

  // The first content block is the model's text answer.
  const first = message.content[0];
  const text = first && first.type === "text" ? first.text : "";
  const sentiment: TicketSummary["sentiment"] = text.includes("angry")
    ? "angry"
    : text.includes("pleased")
      ? "pleased"
      : "neutral";
  return { headline: text.split("\n")[0] ?? "", sentiment };
}
