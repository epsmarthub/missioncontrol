import { NextResponse } from "next/server";
import { hasSupabase } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!hasSupabase) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL("/auth/callback", request.url).toString(),
    },
  });

  return NextResponse.redirect(data.url ?? new URL("/", request.url));
}
