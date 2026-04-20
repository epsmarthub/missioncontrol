import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertIdempotencyKey,
  requireOpenClawAuth,
  toOpenClawErrorResponse,
} from "@/lib/server/openclaw-auth";
import { getOpenClawActor, getOpenClawTaskContext, updateOpenClawTask } from "@/lib/server/openclaw-store";

const bodySchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    difficulty: z.enum(["low", "medium", "high", "critical"]).optional(),
    requiresApproval: z.boolean().optional(),
    assignedAgentIds: z.array(z.string().min(1)).optional(),
    tags: z.array(z.string().min(1)).optional(),
    dueAt: z.string().datetime().optional(),
    blockedReason: z.string().min(1).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Debes enviar al menos un campo para editar la mision.",
  });

export async function GET(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    requireOpenClawAuth(request);
    const { taskId } = await context.params;
    return NextResponse.json({ ok: true, context: await getOpenClawTaskContext(taskId) });
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    const auth = requireOpenClawAuth(request);
    assertIdempotencyKey(auth.requestId);
    const { taskId } = await context.params;
    const body = bodySchema.parse(await request.json());
    const actor = await getOpenClawActor(auth.agentId);

    return NextResponse.json(await updateOpenClawTask(taskId, body, actor));
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
