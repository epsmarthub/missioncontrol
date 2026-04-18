import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env, hasSupabase } from "@/lib/env";

export async function createSupabaseServerClient() {
  if (!hasSupabase) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl!, env.supabaseAnonKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(items) {
        items.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });
}
