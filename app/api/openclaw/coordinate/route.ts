import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertIdempotencyKey,
  requireOpenClawAuth,
  toOpenClawErrorResponse,
} from "@/lib/server/openclaw-auth";
import { coordinateOpenClawAgents } from "@/lib/server/openclaw-store";

const bodySchema = z.object({
  sourceChannelId: z.string().min(1),
  initiatorId: z.string().min(1),
  targetId: z.string().min(1),
  topic: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const auth = requireOpenClawAuth(request);
    assertIdempotencyKey(auth.requestId);
    const body = bodySchema.parse(await request.json());

    return NextResponse.json(await coordinateOpenClawAgents(body));
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
