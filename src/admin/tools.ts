import { openai } from "../lib/client";

// Admin console helper: operators pick the file operation from a dropdown,
// so the method is only known at runtime.
export async function runFileOperation(op: string, fileId: string): Promise<unknown> {
  const files = openai.files as unknown as Record<string, (id: string) => Promise<unknown>>;
  const method = files[op];
  if (!method) throw new Error(`unsupported file operation: ${op}`);
  return method.call(openai.files, fileId);
}
