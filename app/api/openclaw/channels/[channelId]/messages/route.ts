import { NextResponse } from "next/server";
import { requireOpenClawAuth, toOpenClawErrorResponse } from "@/lib/server/openclaw-auth";
import { getOpenClawChannelMessages } from "@/lib/server/openclaw-store";

export async function GET(
  request: Request,
  context: { params: Promise<{ channelId: string }> },
) {
  try {
    requireOpenClawAuth(request);
    const { channelId } = await context.params;
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? "40");

    return NextResponse.json({
      ok: true,
      messages: await getOpenClawChannelMessages(channelId, Number.isFinite(limit) ? limit : 40),
    });
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
