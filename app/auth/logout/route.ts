import { NextResponse } from "next/server";
import { hasSupabase } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (hasSupabase) {
    const supabase = await createSupabaseServerClient();
    await supabase?.auth.signOut();
  }

  return NextResponse.redirect(new URL("/", request.url));
}
