import type OpenAI from "openai";

interface RefundCheckResult {
  eligible: boolean;
  reason: string;
}

async function checkRefundEligibility(args: { orderId: string }): Promise<RefundCheckResult> {
  // Real implementation calls the orders service; stubbed for brevity.
  return { eligible: args.orderId.startsWith("ord_"), reason: "within return window" };
}

// Agentic triage: let the model call our refund-eligibility tool and draft a
// reply in one pass. The client is injected so tests can fake it.
export class TriageAgent {
  constructor(private readonly ai: OpenAI) {}

  async run(orderId: string, message: string): Promise<string> {
    const runner = this.ai.beta.chat.completions.runTools({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You triage refund requests for a storefront." },
        { role: "user", content: `Order ${orderId}: ${message}` },
      ],
      toolContext: undefined,
      tools: [
        {
          type: "function",
          function: {
            function: checkRefundEligibility,
            description: "Check whether an order is eligible for a refund.",
            parse: JSON.parse,
            parameters: {
              type: "object",
              properties: { orderId: { type: "string" } },
              required: ["orderId"],
            },
          },
        },
      ],
    });
    return (await runner.finalContent()) ?? "";
  }
}
