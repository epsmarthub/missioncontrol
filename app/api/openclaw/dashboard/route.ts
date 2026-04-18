import { NextResponse } from "next/server";
import { requireOpenClawAuth, toOpenClawErrorResponse } from "@/lib/server/openclaw-auth";
import { getOpenClawDashboard, listOpenClawDashboardTasks } from "@/lib/server/openclaw-store";

export async function GET(request: Request) {
  try {
    requireOpenClawAuth(request);
    const dashboard = await getOpenClawDashboard();
    const lanes = await listOpenClawDashboardTasks();
    return NextResponse.json({
      ok: true,
      dashboard,
      lanes,
    });
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
