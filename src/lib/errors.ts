import { APIError } from "openai";

export interface LoggedFailure {
  requestId: string | null;
  status: number | undefined;
  message: string;
}

// Normalize OpenAI failures for our log pipeline. Support relies on the
// request id when escalating tickets to the provider.
export function describeOpenAiFailure(err: unknown): LoggedFailure | null {
  if (!(err instanceof APIError)) return null;
  return {
    requestId: err.request_id ?? null,
    status: err.status,
    message: err.message,
  };
}
