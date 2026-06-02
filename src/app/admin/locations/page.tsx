import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LocationsClient } from "./LocationsClient";
import type { City, Club } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminLocationsPage() {
  await requireAdmin();
  const supabase = createClient();

  const [{ data: cities }, { data: clubs }] = await Promise.all([
    supabase.from("cities").select("*").order("name"),
    supabase.from("clubs").select("*").order("name"),
  ]);

  return (
    <LocationsClient
      cities={(cities ?? []) as unknown as City[]}
      clubs={(clubs ?? []) as unknown as Club[]}
    />
  );
}
