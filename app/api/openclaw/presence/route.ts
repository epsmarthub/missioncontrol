import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertIdempotencyKey,
  requireOpenClawAuth,
  toOpenClawErrorResponse,
} from "@/lib/server/openclaw-auth";
import { listOpenClawPresence, updateOpenClawPresence } from "@/lib/server/openclaw-store";

const bodySchema = z.object({
  entityId: z.string().min(1),
  mode: z.enum(["online", "focus", "away", "in_voice"]),
  typing: z.boolean().default(false),
  channelId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    requireOpenClawAuth(request);
    return NextResponse.json({ ok: true, presence: await listOpenClawPresence() });
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireOpenClawAuth(request);
    assertIdempotencyKey(auth.requestId);
    const body = bodySchema.parse(await request.json());
    return NextResponse.json(await updateOpenClawPresence(body));
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
