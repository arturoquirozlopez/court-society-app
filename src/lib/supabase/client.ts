"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/types";

/** Browser-side Supabase client. Use inside Client Components only. */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
