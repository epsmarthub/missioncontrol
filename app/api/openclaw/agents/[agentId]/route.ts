import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertIdempotencyKey,
  requireOpenClawAuth,
  toOpenClawErrorResponse,
} from "@/lib/server/openclaw-auth";
import {
  deleteOpenClawAgent,
  getOpenClawAgent,
  updateOpenClawAgent,
} from "@/lib/server/openclaw-store";

const updateAgentSchema = z.object({
  name: z.string().min(1).optional(),
  handle: z.string().min(1).optional(),
  classId: z.enum(["mage", "hunter", "warrior", "paladin", "rogue", "bard", "engineer", "summoner"]).optional(),
  title: z.string().min(1).optional(),
  level: z.number().int().min(1).optional(),
  currentXp: z.number().int().min(0).optional(),
  nextLevelXp: z.number().int().min(50).optional(),
  specialty: z.string().min(1).optional(),
  avatarSeed: z.string().min(1).optional(),
  voice: z.string().min(1).optional(),
  quote: z.string().min(1).optional(),
  stats: z.object({
    arcana: z.number().int().min(1).optional(),
    tactics: z.number().int().min(1).optional(),
    strength: z.number().int().min(1).optional(),
    agility: z.number().int().min(1).optional(),
    support: z.number().int().min(1).optional(),
  }).partial().optional(),
});

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  try {
    const auth = requireOpenClawAuth(request);
    assertIdempotencyKey(auth.requestId);
    const { agentId } = await context.params;
    const body = updateAgentSchema.parse(await request.json());
    return NextResponse.json(await updateOpenClawAgent(agentId, body));
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ agentId: string }> },
) {
  try {
    const auth = requireOpenClawAuth(request);
    assertIdempotencyKey(auth.requestId);
    const { agentId } = await context.params;
    return NextResponse.json(await deleteOpenClawAgent(agentId));
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
