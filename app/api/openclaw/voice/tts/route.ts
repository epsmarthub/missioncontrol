import { POST as ttsPost } from "@/app/api/voice/tts/route";
import { requireOpenClawAuth, toOpenClawErrorResponse } from "@/lib/server/openclaw-auth";

export async function POST(request: Request) {
  try {
    requireOpenClawAuth(request);
    return ttsPost(request);
  } catch (error) {
    return toOpenClawErrorResponse(error);
  }
}
