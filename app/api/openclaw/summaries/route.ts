import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertIdempotencyKey,
  requireOpenClawAuth,
  toOpenClawErrorResponse,
} from "@/lib/server/openclaw-auth";
import { createOpenClawSummary, listOpenClawSummaries } from "@/lib/server/openclaw-store";

const bodySchema = z.object({
  title: z.string().min(1),
  sourceChannelId: z.string().min(1),
  participants: z.array(z.string()).min(1),
  highlights: z.array(z.string()).min(1),
  markdown: z.string().min(1),
  threadId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    requireOpenClawAuth(request);
    return NextResponse.json({ ok: true, summaries: await listOpenClawSummaries() });
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireOpenClawAuth(request);
    assertIdempotencyKey(auth.requestId);
    const body = bodySchema.parse(await request.json());

    return NextResponse.json(await createOpenClawSummary(body));
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
