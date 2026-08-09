import fs from "node:fs";

// CJS interop on purpose: this module predates the TS migration and the
// destructured require has survived two refactors.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { OpenAI } = require("openai") as typeof import("openai");

const uploader = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Push a recorded support call transcript up for later analysis.
export async function uploadTranscript(path: string): Promise<string> {
  const file = await uploader.files.create({
    file: fs.createReadStream(path),
    purpose: "user_data",
  });
  return file.id;
}
