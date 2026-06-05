import { requireApproved } from "@/lib/auth";
import { SetPasswordForm } from "@/app/auth/reset/set/SetPasswordForm";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * First-time set-password page for legacy members who only ever used magic
 * links. Reachable from the dismissible banner in /app/layout and from the
 * auto-fallback in `signInWithPassword` (after a wrong password attempt).
 */
export default async function SetPasswordPage() {
  const me = await requireApproved();
  const alreadySet = me.password_set_at
    ? new Date(me.password_set_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden">
        <div className="bg-cs-green text-cs-ivory px-7 pt-12 pb-9">
          <div className="text-[9px] tracking-[0.32em] uppercase text-cs-brassLight mb-3">
            A C C O U N T
          </div>
          <h1 className="font-display italic text-[28px] leading-tight">
            Set a password.
          </h1>
          <p className="text-[13px] text-cs-ivory/60 mt-3 leading-relaxed">
            Sign in faster next time — your magic link will keep working too.
          </p>
        </div>
        <div className="px-7 pt-7 pb-12 max-w-[430px]">
          <SetPasswordForm next="/app/profile" />
          {alreadySet && (
            <p className="mt-5 text-[12px] text-cs-muted">
              Already set on {alreadySet}. Submitting again will replace it.
            </p>
          )}
          <Link
            href="/app/profile"
            className="block mt-6 text-[10px] tracking-[0.2em] uppercase text-cs-muted hover:text-cs-black"
          >
            ← Back to your profile
          </Link>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:block px-10 py-12">
        <div className="max-w-[480px]">
          <div className="text-[10px] tracking-[0.28em] uppercase text-cs-brass">
            A C C O U N T
          </div>
          <h1 className="font-display italic text-[42px] text-cs-green mt-2 -tracking-[0.015em]">
            Set a password.
          </h1>
          <p className="text-[13px] text-cs-muted mt-3 leading-relaxed">
            Sign in faster next time — your magic link will keep working too.
          </p>
          <div className="mt-8">
            <SetPasswordForm next="/app/profile" />
          </div>
          {alreadySet && (
            <p className="mt-5 text-[12px] text-cs-muted">
              Already set on {alreadySet}. Submitting again will replace it.
            </p>
          )}
          <Link
            href="/app/profile"
            className="block mt-6 text-[10px] tracking-[0.2em] uppercase text-cs-muted hover:text-cs-black"
          >
            ← Back to your profile
          </Link>
        </div>
      </div>
    </>
  );
}
