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
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.courtsociety.org";

/* ────────── Shared brand shell ──────────
 *
 * Table-based for max email-client compatibility (Outlook strips flex/grid).
 * All styles inline. Web fonts (Playfair Display, DM Sans) are NOT used in
 * email — Outlook/Gmail strip them. We use Georgia for the serif italic look
 * and Helvetica for sans, which render close to the in-app fonts.
 */

const COLORS = {
  ivory:      "#F5F1E8",
  green:      "#0E2A1F",
  brass:      "#A68B5B",
  brassLight: "#C4A96E",
  text:       "#4a4840",
  muted:      "#8A8478",
  black:      "#0A0A0A",
  white:      "#FFFFFF",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(opts: {
  preheader: string;
  title: string;
  body: string;          // raw HTML for the body
  cta?: { label: string; url: string };
}): string {
  const ctaBlock = opts.cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 12px;">
        <tr>
          <td style="background:${COLORS.green};padding:14px 30px;border-bottom:2px solid ${COLORS.brass};">
            <a href="${opts.cta.url}" style="font-family:Helvetica,Arial,sans-serif;font-size:11px;letter-spacing:0.22em;color:${COLORS.ivory};text-transform:uppercase;text-decoration:none;display:inline-block;">${escapeHtml(opts.cta.label)}</a>
          </td>
        </tr>
      </table>
      <p style="margin:8px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:${COLORS.muted};line-height:1.5;">Or paste this link in your browser:<br/><span style="color:${COLORS.text};word-break:break-all;">${escapeHtml(opts.cta.url)}</span></p>
    `
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.ivory};">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${COLORS.ivory};">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.ivory};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;background:${COLORS.white};">

          <!-- Hero -->
          <tr>
            <td style="background:${COLORS.green};padding:40px 36px 36px;">
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:0.32em;color:${COLORS.brass};text-transform:uppercase;margin-bottom:24px;">Court &nbsp; Society</div>
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:30px;font-weight:400;color:${COLORS.ivory};line-height:1.15;letter-spacing:-0.01em;">${escapeHtml(opts.title)}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 36px 28px;">
              <div style="width:32px;height:1px;background:${COLORS.brass};margin:0 0 22px;"></div>
              ${opts.body}
              ${ctaBlock}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:22px 36px 28px;border-top:1px solid rgba(0,0,0,0.08);">
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;letter-spacing:0.22em;color:${COLORS.brass};text-transform:uppercase;text-align:center;">nominations@courtsociety.org</div>
              <div style="font-family:Helvetica,Arial,sans-serif;font-size:10px;color:${COLORS.muted};text-align:center;margin-top:10px;line-height:1.6;">Court Society &middot; Santiago &middot; S&atilde;o Paulo &middot; Miami<br/>A private network. By nomination.</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.75;color:${COLORS.text};">${text}</p>`;
}

function reviewerNote(note: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0 4px;">
    <tr>
      <td style="border-left:2px solid ${COLORS.brass};padding:12px 16px;background:${COLORS.ivory};">
        <div style="font-family:Helvetica,Arial,sans-serif;font-size:9px;letter-spacing:0.2em;color:${COLORS.brass};text-transform:uppercase;margin-bottom:6px;">From your reviewer</div>
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.7;color:${COLORS.text};font-style:italic;">${escapeHtml(note)}</div>
      </td>
    </tr>
  </table>`;
}

/* ────────── Public API ────────── */

export async function sendApplicationReceived(opts: {
  to: string;
  firstName?: string;
}) {
  const r = getResend();
  if (!r) return;
  const name = opts.firstName ? escapeHtml(opts.firstName) : "";
  const greeting = name ? `Dear ${name},` : "Dear applicant,";
  const html = shell({
    preheader:
      "Your application has been received. You will hear from us within seven days.",
    title: "Application received.",
    body:
      paragraph(greeting) +
      paragraph(
        "Your application has been received. We carefully review every application to maintain the quality of the Society.",
      ) +
      paragraph("You will hear from us within seven days."),
  });
  await r.emails.send({
    from: FROM,
    to: opts.to,
    subject: "Your Court Society application",
    html,
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
  const name = opts.firstName ? escapeHtml(opts.firstName) : "";
  const greeting = name ? `Dear ${name},` : "Dear applicant,";

  let subject: string;
  let title: string;
  let body: string;
  let cta: { label: string; url: string } | undefined;
  let preheader: string;

  if (opts.status === "approved") {
    subject = "Welcome to Court Society";
    title = "Welcome to the Society.";
    preheader = "You have been approved as a member of Court Society.";
    body =
      paragraph(greeting) +
      paragraph(
        "You have been approved as a member of Court Society. The membership opens to you today.",
      ) +
      paragraph(
        "Sign in to complete your profile, find members in your club and your city, and arrange your first match.",
      );
    cta = { label: "Open Court Society", url: APP_URL };
  } else if (opts.status === "waitlisted") {
    subject = "Court Society — Waitlist";
    title = "On the waitlist.";
    preheader = "Your application has been placed on the waitlist.";
    body =
      paragraph(greeting) +
      paragraph(
        "Thank you for applying. We&rsquo;ve placed your application on the waitlist while we balance the membership across cities and clubs.",
      ) +
      paragraph("We&rsquo;ll be in touch when a place opens.");
  } else {
    subject = "Court Society — Application update";
    title = "Thank you.";
    preheader = "An update on your Court Society application.";
    body =
      paragraph(greeting) +
      paragraph(
        "We appreciate your interest in Court Society. At this time, we are not able to extend an invitation.",
      ) +
      paragraph(
        "The composition of the Society evolves; you are welcome to apply again in the future.",
      );
  }

  if (opts.note) body += reviewerNote(opts.note);

  const html = shell({ preheader, title, body, cta });

  await r.emails.send({ from: FROM, to: opts.to, subject, html });
}

/**
 * Nomination invite. Sent to a prospective applicant when an approved
 * member nominates them through the in-app "Nominate" sheet.
 */
export async function sendNominationInvite(opts: {
  to: string;
  nomineeName: string;
  nominatorName: string;
  note?: string;
  inviteUrl: string;
}) {
  const r = getResend();
  if (!r) return;

  const nominee = escapeHtml(opts.nomineeName);
  const nominator = escapeHtml(opts.nominatorName);
  const greeting = `Dear ${nominee},`;

  let body =
    paragraph(greeting) +
    paragraph(
      `<strong style="color:${COLORS.green};">${nominator}</strong> has nominated you for membership in Court Society — a private network of founders, investors, and operators who play tennis.`,
    ) +
    paragraph(
      "Tap below to complete your application. The Steward&rsquo;s Office reviews every application; you&rsquo;ll hear back within seven days.",
    );

  if (opts.note) body += reviewerNote(opts.note);

  const html = shell({
    preheader: `${opts.nominatorName} nominated you for Court Society.`,
    title: "You have been nominated.",
    body,
    cta: { label: "Apply for Membership", url: opts.inviteUrl },
  });

  await r.emails.send({
    from: FROM,
    to: opts.to,
    subject: `${opts.nominatorName} nominated you for Court Society`,
    html,
  });
}

/**
 * Match-confirmation request. Sent to the opponent when an author logs a
 * match. The opponent confirms / disputes inside the app's inbox.
 */
export async function sendMatchConfirmationRequest(opts: {
  to: string;
  firstName?: string;
  authorName: string;
  /** From the opponent's POV: "you won" or "they won". */
  opponentWon: boolean;
  score: string | null;
  note?: string;
}) {
  const r = getResend();
  if (!r) return;
  const name = opts.firstName ? escapeHtml(opts.firstName) : "";
  const greeting = name ? `Dear ${name},` : "Hello,";
  const score = (opts.score ?? "—").replace(/-/g, "&ndash;");
  const author = escapeHtml(opts.authorName);
  const outcome = opts.opponentWon ? "you won" : "they won";
  const body =
    paragraph(greeting) +
    paragraph(
      `<strong style="color:${COLORS.green};">${author}</strong> logged a match against you &mdash; ${outcome} <span style="font-family:Georgia,serif;color:${COLORS.green};">${score}</span>.`,
    ) +
    paragraph(
      "Open Court Society and confirm or dispute the result so the ranking stays accurate.",
    ) +
    (opts.note ? reviewerNote(opts.note) : "");
  const html = shell({
    preheader: `${opts.authorName} logged a match. Confirm or dispute it.`,
    title: "Confirm a match result.",
    body,
    cta: { label: "Open Court Society", url: APP_URL },
  });
  await r.emails.send({
    from: FROM,
    to: opts.to,
    subject: `${opts.authorName} logged a match — please confirm`,
    html,
  });
}

/** Group invitation email — sent to each invitee when a group is created. */
export async function sendGroupInvitationEmail(opts: {
  to: string;
  firstName?: string;
  inviterName: string;
  groupName: string;
}) {
  const r = getResend();
  if (!r) return;
  const name = opts.firstName ? escapeHtml(opts.firstName) : "";
  const greeting = name ? `Dear ${name},` : "Hello,";
  const inviter = escapeHtml(opts.inviterName);
  const group = escapeHtml(opts.groupName);
  const body =
    paragraph(greeting) +
    paragraph(
      `<strong style="color:${COLORS.green};">${inviter}</strong> invited you to <span style="font-family:Georgia,serif;font-style:italic;">${group}</span> &mdash; a private ranking group inside Court Society.`,
    ) +
    paragraph(
      "Open the app to accept or decline. Once you accept, the group&rsquo;s ranking unlocks for you.",
    );
  const html = shell({
    preheader: `${opts.inviterName} invited you to ${opts.groupName}.`,
    title: "A private group invitation.",
    body,
    cta: { label: "Open Court Society", url: APP_URL },
  });
  await r.emails.send({
    from: FROM,
    to: opts.to,
    subject: `${opts.inviterName} invited you to ${opts.groupName}`,
    html,
  });
}

/** Direct-challenge email — sent to the target of a challenge. */
export async function sendDirectChallenge(opts: {
  to: string;
  firstName?: string;
  authorName: string;
  cityName: string;
  format: string;
  note?: string;
}) {
  const r = getResend();
  if (!r) return;
  const name = opts.firstName ? escapeHtml(opts.firstName) : "";
  const greeting = name ? `Dear ${name},` : "Hello,";
  const author = escapeHtml(opts.authorName);
  const city = escapeHtml(opts.cityName);
  const format = escapeHtml(opts.format);
  const body =
    paragraph(greeting) +
    paragraph(
      `<strong style="color:${COLORS.green};">${author}</strong> has challenged you to a ${format} match in <span style="font-family:Georgia,serif;font-style:italic;">${city}</span>.`,
    ) +
    paragraph(
      "Open Court Society to accept or decline. You have 72 hours before the challenge expires.",
    ) +
    (opts.note ? reviewerNote(opts.note) : "");
  const html = shell({
    preheader: `${opts.authorName} challenged you in ${opts.cityName}.`,
    title: "A direct challenge.",
    body,
    cta: { label: "Open Court Society", url: APP_URL },
  });
  await r.emails.send({
    from: FROM,
    to: opts.to,
    subject: `${opts.authorName} challenged you in ${opts.cityName}`,
    html,
  });
}
