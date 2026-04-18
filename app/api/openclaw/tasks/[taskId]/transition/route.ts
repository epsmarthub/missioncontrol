import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertIdempotencyKey,
  requireOpenClawAuth,
  toOpenClawErrorResponse,
} from "@/lib/server/openclaw-auth";
import { getOpenClawActor, transitionOpenClawTask } from "@/lib/server/openclaw-store";

const bodySchema = z.object({
  nextStatus: z.enum(["backlog", "in_progress", "review", "done"]),
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

    return NextResponse.json(await transitionOpenClawTask(taskId, body.nextStatus, actor));
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
