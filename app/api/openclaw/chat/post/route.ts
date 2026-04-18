import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertIdempotencyKey,
  requireOpenClawAuth,
  toOpenClawErrorResponse,
} from "@/lib/server/openclaw-auth";
import { getOpenClawActor, postOpenClawMessage } from "@/lib/server/openclaw-store";

const bodySchema = z.object({
  channelId: z.string().min(1),
  content: z.string().min(1),
  mentions: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const auth = requireOpenClawAuth(request);
    assertIdempotencyKey(auth.requestId);
    const body = bodySchema.parse(await request.json());
    const actor = await getOpenClawActor(auth.agentId);

    return NextResponse.json(await postOpenClawMessage({ ...body, actor }));
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
