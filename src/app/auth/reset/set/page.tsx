import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetPasswordForm } from "./SetPasswordForm";

export const dynamic = "force-dynamic";

/**
 * Where the user lands after the password-reset code is exchanged. We don't
 * need the user's profile here — we only need the session to call
 * `supabase.auth.updateUser({ password })` on submit.
 */
export default async function ResetSetPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?e=Reset+session+expired.+Request+a+fresh+link.");

  return (
    <div className="min-h-dvh flex flex-col">
      <div className="bg-cs-green text-cs-ivory px-7 pt-12 pb-9">
        <div className="text-[9px] tracking-[0.32em] uppercase text-cs-brassLight mb-3">
          C O U R T &nbsp; S O C I E T Y
        </div>
        <h1 className="font-display italic text-[30px] leading-tight">
          Set a new password.
        </h1>
        <p className="text-[13px] text-cs-ivory/60 mt-3 leading-relaxed">
          Choose a password of at least 8 characters.
        </p>
      </div>
      <div className="px-7 pt-9 pb-12 flex-1">
        <SetPasswordForm next="/app/profile" />
      </div>
    </div>
  );
}
