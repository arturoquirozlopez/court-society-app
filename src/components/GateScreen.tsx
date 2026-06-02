import { SignOutLink } from "./SignOutLink";

/**
 * Full-screen brand gate used for pending / waitlisted / rejected screens
 * and for the "no club match" waitlist in the apply flow.
 * Ports the prototype's `.applied` / `.waitlist` look.
 */
export function GateScreen({
  mark,
  title,
  body,
  footer,
}: {
  mark: string;
  title: React.ReactNode;
  body: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-cs-green text-cs-ivory flex flex-col items-center justify-center px-8 py-11 text-center">
      <div className="w-12 h-12 border border-cs-brass/40 flex items-center justify-center text-[22px] mb-8">
        {mark}
      </div>
      <h1 className="font-display italic text-[30px] leading-[1.2] mb-4">{title}</h1>
      <p className="text-[13px] text-cs-ivory/60 leading-[1.75] max-w-[320px] mb-8">
        {body}
      </p>
      <div className="text-[11px] text-cs-brassLight tracking-[0.06em] border-t border-cs-brass/25 pt-5">
        nominations@courtsociety.org
      </div>
      {footer}
      <div className="mt-8">
        <SignOutLink />
      </div>
    </div>
  );
}
