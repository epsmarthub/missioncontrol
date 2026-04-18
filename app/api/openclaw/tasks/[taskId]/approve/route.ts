import { NextResponse } from "next/server";
import {
  assertIdempotencyKey,
  requireOpenClawAuth,
  toOpenClawErrorResponse,
} from "@/lib/server/openclaw-auth";
import { approveOpenClawTask, getOpenClawActor } from "@/lib/server/openclaw-store";

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    const auth = requireOpenClawAuth(request);
    assertIdempotencyKey(auth.requestId);
    const { taskId } = await context.params;
    const actor = await getOpenClawActor(auth.agentId);

    return NextResponse.json(await approveOpenClawTask(taskId, actor));
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
