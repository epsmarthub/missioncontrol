import { NextResponse } from "next/server";
import { dispatchMentionAndPersist } from "@/lib/server/missioncontrol-db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      channelId: string;
      message: string;
      agentId: string;
    };

    const result = await dispatchMentionAndPersist({
      channelId: body.channelId,
      message: body.message,
      agentId: body.agentId,
      authorId: "user-vega",
      authorName: "Commander Vega",
      authorType: "user",
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo resolver la mencion." },
      { status: 500 },
    );
  }
}
