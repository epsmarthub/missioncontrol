import { NextResponse } from "next/server";
import { z } from "zod";
import { createDemoSnapshot } from "@/lib/demo-data";
import { hasDatabase } from "@/lib/env";
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

    if (!hasDatabase) {
      const snapshot = createDemoSnapshot();
      snapshot.tasks = snapshot.tasks.map((task) =>
        task.id === taskId ? { ...task, status: body.nextStatus } : task,
      );

      return NextResponse.json({
        ok: true,
        snapshot,
      });
    }

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
