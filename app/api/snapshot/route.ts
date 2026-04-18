import { NextResponse } from "next/server";
import { createDemoSnapshot } from "@/lib/demo-data";
import { hasDatabase } from "@/lib/env";
import { getMissionControlSnapshotFromDb } from "@/lib/server/missioncontrol-db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = hasDatabase
      ? await getMissionControlSnapshotFromDb()
      : createDemoSnapshot();

    return NextResponse.json(
      { ok: true, snapshot },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "No se pudo sincronizar el snapshot.",
      },
      { status: 500 },
    );
  }
}
