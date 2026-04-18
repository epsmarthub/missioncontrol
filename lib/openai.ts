import OpenAI from "openai";
import { env, hasOpenAI } from "@/lib/env";

let client: OpenAI | null = null;

export function getOpenAI() {
  if (!hasOpenAI) {
    return null;
  }

  if (!client) {
    client = new OpenAI({ apiKey: env.openaiApiKey });
  }

  return client;
}
