import { openai } from "../lib/client";

// Admin console helper: operators pick the file operation from a dropdown,
// so the method is only known at runtime.
export async function runFileOperation(op: string, fileId: string): Promise<unknown> {
  const files = openai.files as unknown as Record<string, (id: string) => Promise<unknown>>;
  const methodName = op === "del" ? "delete" : op === "retrieveContent" ? "content" : op;
  const method = files[methodName];
  if (!method) throw new Error(`unsupported file operation: ${op}`);
  const result = await method.call(openai.files, fileId);
  return op === "retrieveContent" ? (result as Response).text() : result;
}
