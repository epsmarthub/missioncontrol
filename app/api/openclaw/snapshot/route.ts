import { NextResponse } from "next/server";
import { requireOpenClawAuth, toOpenClawErrorResponse } from "@/lib/server/openclaw-auth";
import { getOpenClawSnapshotView } from "@/lib/server/openclaw-store";

export async function GET(request: Request) {
  try {
    requireOpenClawAuth(request);
    return NextResponse.json(await getOpenClawSnapshotView());
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
