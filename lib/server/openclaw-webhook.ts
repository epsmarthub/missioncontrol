import { env, hasOpenClawWebhook } from "@/lib/env";

export interface OpenClawMentionWebhookPayload {
  eventId: string;
  event: "agent.mentioned";
  timestamp: string;
  channelId: string;
  messageId: string;
  agent: {
    id: string;
    name: string;
  };
  author: {
    id: string;
    name: string;
    type: "user" | "agent";
  };
  content: string;
}

export async function sendOpenClawMentionWebhook(payload: OpenClawMentionWebhookPayload) {
  if (!hasOpenClawWebhook || !env.openclawWebhookUrl || !env.openclawWebhookSecret) {
    return {
      delivered: false,
      reason: "webhook-not-configured",
    } as const;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, Math.max(env.openclawWebhookTimeoutMs, 1000));

  try {
    const response = await fetch(env.openclawWebhookUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openclawWebhookSecret}`,
        "Content-Type": "application/json",
        "Idempotency-Key": payload.eventId,
        "X-MissionControl-Event": payload.event,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        delivered: false,
        reason: `webhook-http-${response.status}`,
      } as const;
    }

    return {
      delivered: true,
    } as const;
  } catch (error) {
    return {
      delivered: false,
      reason: error instanceof Error ? error.message : "webhook-error",
    } as const;
  } finally {
    clearTimeout(timeoutId);
  }
}
