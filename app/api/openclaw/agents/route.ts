import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertIdempotencyKey,
  requireOpenClawAuth,
  toOpenClawErrorResponse,
} from "@/lib/server/openclaw-auth";
import { createOpenClawAgent, listOpenClawAgents } from "@/lib/server/openclaw-store";

const createAgentSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().min(1),
  handle: z.string().min(1),
  classId: z.enum(["mage", "hunter", "warrior", "paladin", "rogue", "bard", "engineer", "summoner"]),
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

export async function GET(request: Request) {
  try {
    requireOpenClawAuth(request);
    return NextResponse.json({ ok: true, agents: await listOpenClawAgents() });
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireOpenClawAuth(request);
    assertIdempotencyKey(auth.requestId);
    const body = createAgentSchema.parse(await request.json());
    return NextResponse.json(await createOpenClawAgent(body));
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
