import { NextResponse } from "next/server";
import { requireOpenClawAuth, toOpenClawErrorResponse } from "@/lib/server/openclaw-auth";
import { getOpenClawSummary } from "@/lib/server/openclaw-store";

export async function GET(
  request: Request,
  context: { params: Promise<{ summaryId: string }> },
) {
  try {
    requireOpenClawAuth(request);
    const { summaryId } = await context.params;
    return NextResponse.json({ ok: true, summary: await getOpenClawSummary(summaryId) });
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
