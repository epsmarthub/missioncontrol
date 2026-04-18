import { NextResponse } from "next/server";
import { requireOpenClawAuth, toOpenClawErrorResponse } from "@/lib/server/openclaw-auth";
import { getOpenClawHealth } from "@/lib/server/openclaw-store";

export async function GET(request: Request) {
  try {
    requireOpenClawAuth(request);
    return NextResponse.json(await getOpenClawHealth());
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
