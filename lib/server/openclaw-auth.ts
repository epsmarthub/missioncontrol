import { NextResponse } from "next/server";
import { env, hasOpenClawApiKey } from "@/lib/env";

export interface OpenClawRequestContext {
  agentId?: string;
  requestId?: string;
}

export class OpenClawApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function requireOpenClawAuth(request: Request): OpenClawRequestContext {
  if (!hasOpenClawApiKey || !env.openclawApiKey) {
    throw new OpenClawApiError(503, "OPENCLAW_API_KEY no configurada.");
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : null;

  if (!token) {
    throw new OpenClawApiError(401, "Falta Authorization Bearer token.");
  }

  if (token !== env.openclawApiKey) {
    throw new OpenClawApiError(403, "Token OpenClaw invalido.");
  }

  return {
    agentId: request.headers.get("x-openclaw-agent-id") ?? undefined,
    requestId: request.headers.get("idempotency-key") ?? undefined,
  };
}

export function assertIdempotencyKey(requestId?: string) {
  if (!requestId) {
    throw new OpenClawApiError(400, "Idempotency-Key es obligatorio para escrituras.");
  }
}

export function toOpenClawErrorResponse(error: unknown) {
  if (error instanceof OpenClawApiError) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
  }

  return NextResponse.json(
    { ok: false, error: error instanceof Error ? error.message : "Error OpenClaw desconocido." },
    { status: 500 },
  );
}
