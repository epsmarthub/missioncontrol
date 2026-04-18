import { NextResponse } from "next/server";
import { requireOpenClawAuth, toOpenClawErrorResponse } from "@/lib/server/openclaw-auth";
import { getOpenClawStandup } from "@/lib/server/openclaw-store";

export async function GET(request: Request) {
  try {
    requireOpenClawAuth(request);
    return NextResponse.json(await getOpenClawStandup());
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
