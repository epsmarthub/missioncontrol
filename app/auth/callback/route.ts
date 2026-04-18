import { NextResponse } from "next/server";
import { hasSupabase } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!hasSupabase || !code) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const supabase = await createSupabaseServerClient();
  await supabase?.auth.exchangeCodeForSession(code);

  return NextResponse.redirect(new URL("/", request.url));
}
