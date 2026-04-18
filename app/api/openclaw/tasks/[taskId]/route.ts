import { NextResponse } from "next/server";
import { requireOpenClawAuth, toOpenClawErrorResponse } from "@/lib/server/openclaw-auth";
import { getOpenClawTaskContext } from "@/lib/server/openclaw-store";

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
