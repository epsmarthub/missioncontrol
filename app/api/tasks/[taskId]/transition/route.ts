import { NextResponse } from "next/server";
import { z } from "zod";
import { transitionMissionControlTask } from "@/lib/server/missioncontrol-db";

const bodySchema = z.object({
  nextStatus: z.enum(["backlog", "in_progress", "review", "done", "closed"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await context.params;
    const body = bodySchema.parse(await request.json());
    const snapshot = await transitionMissionControlTask(taskId, body.nextStatus, "Commander Vega");

    return NextResponse.json({
      ok: true,
      snapshot,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo mover la tarea." },
      { status: 500 },
    );
  }
}
