import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getCityMap, getClubMap } from "@/lib/queries";
import { MembersAdminClient } from "./MembersClient";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MembersAdminPage() {
  const me = await requireAdmin();
  const supabase = createClient();
  const [{ data: profiles }, cityMap, clubMap] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    getCityMap(),
    getClubMap(),
  ]);

  return (
    <MembersAdminClient
      meId={me.id}
      meRole={me.role}
      members={(profiles ?? []) as Profile[]}
      cityById={Object.fromEntries(cityMap)}
      clubById={Object.fromEntries(clubMap)}
    />
  );
}
