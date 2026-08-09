import { Router } from "express";
import { z } from "zod";
import { openai } from "../lib/client";
import { describeOpenAiFailure } from "../lib/errors";

const BodySchema = z.object({ orderId: z.string(), message: z.string().min(1) });

export const supportRouter = Router();

// Classify an inbound support message into a structured ticket. The parse
// helper gives us schema-validated output straight from the model.
supportRouter.post("/classify", async (req, res) => {
  const body = BodySchema.parse(req.body);
  try {
    const completion = await openai.beta.chat.completions.parse({
      model: "gpt-4o-2024-08-06",
      messages: [
        {
          role: "system",
          content:
            "Classify the customer message. Respond with JSON: {category, urgency, summary}.",
        },
        { role: "user", content: `Order ${body.orderId}: ${body.message}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ticket",
          schema: {
            type: "object",
            properties: {
              category: { type: "string" },
              urgency: { type: "string" },
              summary: { type: "string" },
            },
            required: ["category", "urgency", "summary"],
            additionalProperties: false,
          },
        },
      },
    });
    res.json({ ticket: completion.choices[0]?.message.parsed ?? null });
  } catch (err) {
    const failure = describeOpenAiFailure(err);
    if (failure) {
      res.status(502).json({ error: "provider_error", requestId: failure.requestId });
      return;
    }
    throw err;
  }
});
