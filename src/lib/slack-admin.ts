// Slack workspace admin helpers for the support console. Called over plain
// HTTP rather than through @slack/web-api — same reasoning as notify.ts, we
// did not want the SDK in the request path just for a handful of endpoints.

const SLACK_API = "slack.com/api";

function authHeaders(): Record<string, string> {
  return {
    authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    "content-type": "application/json; charset=utf-8",
  };
}

interface SlackEnvelope {
  ok: boolean;
  error?: string;
  response_metadata?: { next_cursor?: string };
}

async function slackGet<T>(
  method: string,
  params: Record<string, string>,
): Promise<SlackEnvelope & T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`https://${SLACK_API}/${method}?${qs}`, {
    method: "GET",
    headers: authHeaders(),
  });
  const body = (await res.json()) as SlackEnvelope & T;
  if (!body.ok) throw new Error(`slack ${method}: ${body.error ?? "unknown_error"}`);
  return body;
}

// Every public channel the bot can see, paged to exhaustion.
export async function listSupportChannels(): Promise<{ id: string; name: string }[]> {
  const channels: { id: string; name: string }[] = [];
  let cursor = "";
  do {
    const page = await slackGet<{
      channels: { id: string; name: string; is_archived: boolean }[];
    }>("conversations.list", {
      types: "public_channel",
      exclude_archived: "true",
      limit: "200",
      ...(cursor ? { cursor } : {}),
    });
    for (const c of page.channels) {
      if (!c.is_archived) channels.push({ id: c.id, name: c.name });
    }
    cursor = page.response_metadata?.next_cursor ?? "";
  } while (cursor);
  return channels;
}

// Resolve the human behind an order note so support can @-mention them.
export async function lookupAgent(userId: string): Promise<{ realName: string; tz: string }> {
  const body = await slackGet<{
    user: { real_name: string; tz: string; profile: { email?: string } };
  }>("users.info", { user: userId, include_locale: "true" });
  return { realName: body.user.real_name, tz: body.user.tz };
}

// Edit the order alert in place as the order moves through fulfilment.
export async function updateOrderAlert(
  channel: string,
  ts: string,
  text: string,
): Promise<void> {
  const res = await fetch(`https://${SLACK_API}/chat.update`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      channel,
      ts,
      text,
      // Legacy secondary attachments — the modern equivalent is `blocks`.
      attachments: [{ color: "#36a64f", text, footer: "acme-checkout" }],
      as_user: true,
    }),
  });
  const body = (await res.json()) as SlackEnvelope;
  if (!body.ok) throw new Error(`slack chat.update: ${body.error ?? "unknown_error"}`);
}

// Attach a packing slip to the order thread.
export async function attachPackingSlip(
  channel: string,
  threadTs: string,
  filename: string,
  content: string,
): Promise<string> {
  const res = await fetch(`https://${SLACK_API}/files.upload`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      channels: channel,
      thread_ts: threadTs,
      filename,
      filetype: "text",
      content,
      initial_comment: "Packing slip for this order.",
    }).toString(),
  });
  const body = (await res.json()) as SlackEnvelope & { file: { id: string } };
  if (!body.ok) throw new Error(`slack files.upload: ${body.error ?? "unknown_error"}`);
  return body.file.id;
}
