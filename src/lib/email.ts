import { Resend } from "resend";

/**
 * Resend wrapper. Returns gracefully (logs a warning) when RESEND_API_KEY
 * is missing — useful in local dev. In production, the env var must be set.
 */
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — skipping send.");
    return null;
  }
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM_EMAIL ?? "Court Society <noreply@example.com>";

export async function sendApplicationReceived(opts: {
  to: string;
  firstName?: string;
}) {
  const r = getResend();
  if (!r) return;
  const name = opts.firstName ?? "";
  const greeting = name ? `Dear ${name},` : "Dear applicant,";
  await r.emails.send({
    from: FROM,
    to: opts.to,
    subject: "Your Court Society application",
    html: `
      <div style="font-family:Georgia,serif;color:#0E2A1F;max-width:520px">
        <p style="font-size:18px;font-style:italic">${greeting}</p>
        <p>Your application has been received. We carefully review every application to maintain the quality of the Society.</p>
        <p>You will hear from us within seven days.</p>
        <p style="margin-top:32px;color:#A68B5B;letter-spacing:.06em;font-size:11px;text-transform:uppercase">Court Society</p>
      </div>
    `,
  });
}

export async function sendStatusChange(opts: {
  to: string;
  firstName?: string;
  status: "approved" | "waitlisted" | "rejected";
  note?: string;
}) {
  const r = getResend();
  if (!r) return;
  const name = opts.firstName ?? "";
  const greeting = name ? `Dear ${name},` : "Dear applicant,";

  const subject =
    opts.status === "approved"
      ? "Welcome to Court Society"
      : opts.status === "waitlisted"
        ? "Court Society — Waitlist"
        : "Court Society — Application update";

  const body =
    opts.status === "approved"
      ? `<p>You have been approved as a member of Court Society. Welcome.</p>
         <p>Sign in at <a href="${process.env.NEXT_PUBLIC_APP_URL}">app.courtsociety.org</a> to complete your profile and meet the Society.</p>`
      : opts.status === "waitlisted"
        ? `<p>Thank you for applying. We've placed your application on the waitlist while we balance the membership.</p>
           <p>We'll be in touch when a spot opens.</p>`
        : `<p>Thank you for your interest. At this time, we are not able to extend an invitation.</p>`;

  await r.emails.send({
    from: FROM,
    to: opts.to,
    subject,
    html: `
      <div style="font-family:Georgia,serif;color:#0E2A1F;max-width:520px">
        <p style="font-size:18px;font-style:italic">${greeting}</p>
        ${body}
        ${opts.note ? `<p style="border-left:2px solid #A68B5B;padding:8px 12px;color:#555;background:#F5F1E8">${opts.note}</p>` : ""}
        <p style="margin-top:32px;color:#A68B5B;letter-spacing:.06em;font-size:11px;text-transform:uppercase">Court Society</p>
      </div>
    `,
  });
}
