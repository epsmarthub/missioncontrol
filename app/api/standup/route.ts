import { NextResponse } from "next/server";
import { getMissionControlDashboardFromDb } from "@/lib/server/missioncontrol-db";

export async function GET() {
  try {
    const dashboard = await getMissionControlDashboardFromDb();
    return NextResponse.json({
      markdown: dashboard.standupMarkdown,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo generar el stand-up." },
      { status: 500 },
    );
  }
}
