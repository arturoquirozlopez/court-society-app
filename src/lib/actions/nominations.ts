"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendNominationInvite } from "@/lib/email";
import type { NominationByToken } from "@/lib/types";

const NominationInput = z.object({
  nominee_name: z.string().min(2, "Name is required.").max(120),
  nominee_email: z.string().email("Enter a valid email."),
  note: z.string().max(500).optional().or(z.literal("")),
});

export type NominationResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Create a nomination. Only callable by approved members. Sends a branded
 * invitation email to the nominee with a tokenised link to /apply.
 */
export async function createNomination(
  input: z.infer<typeof NominationInput>,
): Promise<NominationResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const parsed = NominationInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  const v = parsed.data;

  // Get the nominator's name for the email
  const { data: me } = await supabase
    .from("profiles")
    .select("full_name, status")
    .eq("id", user.id)
    .maybeSingle();
  const meRow = me as { full_name: string | null; status: string } | null;
  if (!meRow || meRow.status !== "approved")
    return { ok: false, error: "Only approved members can nominate." };

  const { data: created, error } = await supabase
    .from("nominations")
    .insert({
      nominator_id: user.id,
      nominee_name: v.nominee_name,
      nominee_email: v.nominee_email.toLowerCase(),
      note: v.note || null,
    })
    .select("id, token")
    .single();
  if (error || !created)
    return { ok: false, error: error?.message ?? "Insert failed." };

  const row = created as { id: string; token: string };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.courtsociety.org";
  const inviteUrl = `${appUrl}/apply?nom=${row.token}`;

  void sendNominationInvite({
    to: v.nominee_email,
    nomineeName: v.nominee_name.split(" ")[0],
    nominatorName: meRow.full_name ?? "A member",
    note: v.note || undefined,
    inviteUrl,
  }).catch((err) =>
    console.error("[email] sendNominationInvite failed:", err),
  );

  revalidatePath("/app/profile");
  return { ok: true, id: row.id };
}

/** Cancel a pending nomination (nominator only). */
export async function cancelNomination(id: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("nominations")
    .update({ status: "cancelled" })
    .eq("id", id);
  if (error) return { ok: false, error: error.message } as const;
  revalidatePath("/app/profile");
  return { ok: true } as const;
}

/**
 * Look up a nomination by its public token. Used on /apply when a nominee
 * arrives via the email link. Bypasses RLS via the SECURITY DEFINER
 * Postgres function `nomination_by_token`.
 */
export async function getNominationByToken(
  token: string,
): Promise<NominationByToken | null> {
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return null;
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("nomination_by_token", { t: token });
  if (error || !data) return null;
  const rows = data as unknown as NominationByToken[];
  return rows[0] ?? null;
}
