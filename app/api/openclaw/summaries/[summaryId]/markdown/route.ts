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
    const summary = await getOpenClawSummary(summaryId);

    return new NextResponse(summary.markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
