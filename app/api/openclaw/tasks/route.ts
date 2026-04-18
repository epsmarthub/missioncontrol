import { NextResponse } from "next/server";
import { requireOpenClawAuth, toOpenClawErrorResponse } from "@/lib/server/openclaw-auth";
import { listOpenClawTasks } from "@/lib/server/openclaw-store";

export async function GET(request: Request) {
  try {
    requireOpenClawAuth(request);
    return NextResponse.json({ ok: true, tasks: await listOpenClawTasks() });
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
