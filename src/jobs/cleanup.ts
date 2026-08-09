import { openai } from "../lib/client";

const RETENTION_DAYS = 30;

// Nightly job: delete transcript uploads older than the retention window.
export async function cleanupExpiredUploads(): Promise<number> {
  const cutoff = Date.now() / 1000 - RETENTION_DAYS * 24 * 60 * 60;
  let deleted = 0;
  const files = await openai.files.list({ purpose: "user_data" });
  for (const file of files.data) {
    if (file.created_at < cutoff) {
      await openai.files.del(file.id);
      deleted += 1;
    }
  }
  return deleted;
}

// Retired fine-tunes are removed once their replacement has been promoted.
export async function retireModel(modelId: string): Promise<void> {
  await openai.models.del(modelId);
}
