export const env = {
  databaseUrl: process.env.DATABASE_URL,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRole: process.env.SUPABASE_SERVICE_ROLE_KEY,
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiTextModel: process.env.OPENAI_TEXT_MODEL ?? "gpt-5-mini",
  openaiRealtimeModel: process.env.OPENAI_REALTIME_MODEL ?? "gpt-realtime",
  openaiVoiceModel: process.env.OPENAI_TTS_MODEL ?? "gpt-4o-mini-tts",
  openclawApiKey:
    process.env.OPENCLAW_API_KEY ??
    (process.env.NODE_ENV !== "production" ? "missioncontrol-dev-key" : undefined),
  openclawWebhookUrl: process.env.OPENCLAW_WEBHOOK_URL,
  openclawWebhookSecret: process.env.OPENCLAW_WEBHOOK_SECRET,
  openclawWebhookTimeoutMs: Number.parseInt(
    process.env.OPENCLAW_WEBHOOK_TIMEOUT_MS ?? "5000",
    10,
  ),
};

export const hasDatabase = Boolean(env.databaseUrl);
export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const hasOpenAI = Boolean(env.openaiApiKey);
export const hasOpenClawApiKey = Boolean(env.openclawApiKey);
export const hasOpenClawWebhook = Boolean(env.openclawWebhookUrl && env.openclawWebhookSecret);
