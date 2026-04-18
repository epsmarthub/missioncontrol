import { NextResponse } from "next/server";
import { requireOpenClawAuth, toOpenClawErrorResponse } from "@/lib/server/openclaw-auth";
import { getOpenClawAgent } from "@/lib/server/openclaw-store";

export async function GET(
  request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  try {
    requireOpenClawAuth(request);
    const { agentId } = await context.params;
    return NextResponse.json({ ok: true, agent: await getOpenClawAgent(agentId) });
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
