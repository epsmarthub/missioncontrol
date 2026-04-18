import { NextResponse } from "next/server";
import { createVoiceSessionInDb } from "@/lib/server/missioncontrol-db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      agentId?: string;
      channelId?: string;
      enabled?: boolean;
    };
    const { session, snapshot } = await createVoiceSessionInDb(body);

    return NextResponse.json({
      ...session,
      snapshot,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo abrir la sesion de voz." },
      { status: 500 },
    );
  }
}
