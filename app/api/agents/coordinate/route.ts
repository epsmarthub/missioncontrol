import { NextResponse } from "next/server";
import { coordinateAgentsAndPersist } from "@/lib/server/missioncontrol-db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      sourceChannelId: string;
      initiatorId: string;
      targetId: string;
      topic: string;
    };

    const { payload, snapshot } = await coordinateAgentsAndPersist(body);

    return NextResponse.json({
      ...payload,
      snapshot,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo coordinar agentes." },
      { status: 500 },
    );
  }
}
