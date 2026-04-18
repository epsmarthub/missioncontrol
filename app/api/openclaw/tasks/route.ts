import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertIdempotencyKey,
  requireOpenClawAuth,
  toOpenClawErrorResponse,
} from "@/lib/server/openclaw-auth";
import { createOpenClawTask, getOpenClawActor, listOpenClawTasks } from "@/lib/server/openclaw-store";

const bodySchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  difficulty: z.enum(["low", "medium", "high", "critical"]).optional(),
  requiresApproval: z.boolean().optional(),
  assignedAgentIds: z.array(z.string().min(1)).optional(),
  tags: z.array(z.string().min(1)).optional(),
  dueAt: z.string().datetime().optional(),
  blockedReason: z.string().min(1).optional(),
});

export async function GET(request: Request) {
  try {
    requireOpenClawAuth(request);
    const url = new URL(request.url);
    const includeClosed = url.searchParams.get("includeClosed") === "true";
    const statusParam = url.searchParams.get("status");
    const status =
      statusParam === "backlog" ||
      statusParam === "in_progress" ||
      statusParam === "review" ||
      statusParam === "done" ||
      statusParam === "closed"
        ? statusParam
        : undefined;

    return NextResponse.json({
      ok: true,
      tasks: await listOpenClawTasks({ includeClosed, status }),
    });
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireOpenClawAuth(request);
    assertIdempotencyKey(auth.requestId);
    const body = bodySchema.parse(await request.json());
    const actor = await getOpenClawActor(auth.agentId);

    return NextResponse.json(await createOpenClawTask(body, actor));
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
