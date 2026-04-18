import { NextResponse } from "next/server";
import { env, hasOpenAI } from "@/lib/env";
import { getOpenAI } from "@/lib/openai";

export async function POST(request: Request) {
  const body = (await request.json()) as { text: string; voice?: string };

  if (!hasOpenAI) {
    return NextResponse.json(
      { ok: false, message: "OPENAI_API_KEY no configurada. Usa modo demo." },
      { status: 503 },
    );
  }

  const openai = getOpenAI();

  if (!openai) {
    return NextResponse.json({ ok: false, message: "Cliente OpenAI no disponible." }, { status: 503 });
  }

  const response = await openai.audio.speech.create({
    model: env.openaiVoiceModel,
    voice: body.voice ?? "alloy",
    input: body.text,
  });

  const buffer = Buffer.from(await response.arrayBuffer());

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
