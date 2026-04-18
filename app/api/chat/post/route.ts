import { NextResponse } from "next/server";
import { z } from "zod";
import { postMissionControlMessage } from "@/lib/server/missioncontrol-db";

const bodySchema = z.object({
  channelId: z.string().min(1),
  content: z.string().min(1),
  mentions: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const snapshot = await postMissionControlMessage({
      channelId: body.channelId,
      authorId: "user-vega",
      authorName: "Commander Vega",
      authorType: "user",
      content: body.content,
      mentions: body.mentions ?? [],
    });

    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "No se pudo publicar." },
      { status: 500 },
    );
  }
}
