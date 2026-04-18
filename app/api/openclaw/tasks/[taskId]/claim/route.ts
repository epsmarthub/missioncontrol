import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertIdempotencyKey,
  requireOpenClawAuth,
  toOpenClawErrorResponse,
} from "@/lib/server/openclaw-auth";
import { claimOpenClawTask, getOpenClawActor } from "@/lib/server/openclaw-store";

const bodySchema = z.object({
  agentId: z.string().min(1),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    const auth = requireOpenClawAuth(request);
    assertIdempotencyKey(auth.requestId);
    const { taskId } = await context.params;
    const body = bodySchema.parse(await request.json());
    const actor = await getOpenClawActor(auth.agentId);

    return NextResponse.json(await claimOpenClawTask(taskId, body.agentId, actor));
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
