import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/db/types";

/**
 * Server-side Supabase client (Server Components, Server Actions, Route Handlers).
 * Cookies are read/written through Next's cookies() API so the session is shared
 * with the browser.
 */
export function createClient() {
  const cookieStore = cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component; safe to ignore — middleware refreshes the session.
          }
        },
      },
    },
  );
}

/**
 * Service-role Supabase client. SERVER ONLY. Never expose to the browser.
 * Use sparingly — for operations that must bypass RLS (admin scripts, cron).
 */
export function createServiceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } },
  );
}
