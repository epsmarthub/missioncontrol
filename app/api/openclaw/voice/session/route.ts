import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertIdempotencyKey,
  requireOpenClawAuth,
  toOpenClawErrorResponse,
} from "@/lib/server/openclaw-auth";
import { createOpenClawVoiceSession } from "@/lib/server/openclaw-store";

const bodySchema = z.object({
  agentId: z.string().optional(),
  channelId: z.string().optional(),
  enabled: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const auth = requireOpenClawAuth(request);
    assertIdempotencyKey(auth.requestId);
    const body = bodySchema.parse(await request.json());
    return NextResponse.json(
      await createOpenClawVoiceSession(
        body.agentId ?? auth.agentId,
        body.enabled ?? true,
        body.channelId,
      ),
    );
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
