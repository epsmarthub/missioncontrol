import { NextResponse } from "next/server";
import { approveMissionControlTask } from "@/lib/server/missioncontrol-db";

export async function POST(
  _request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  try {
    const { taskId } = await context.params;
    const snapshot = await approveMissionControlTask(taskId, "Commander Vega");

    return NextResponse.json({
      ok: true,
      snapshot,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No se pudo aprobar la tarea.",
      },
      { status: 500 },
    );
  }
}
