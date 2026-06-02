export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function fmtRel(d: string | Date) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return fmtDate(d);
}

export function hoursLeft(expiresAt: string | Date) {
  return Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 3600000),
  );
}

export function winRate(w: number, l: number) {
  return w + l > 0 ? Math.round((w / (w + l)) * 100) : 0;
}

/** WhatsApp deep-link with prefilled message body. */
export function waLink(phone: string | null | undefined, text?: string) {
  if (!phone) return "#";
  const num = phone.replace(/[^0-9]/g, "");
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${num}${q}`;
}

/**
 * Normalize a LinkedIn URL into { url, label }. Ensures the link is openable
 * (adds https:// when missing) and produces a short display string like
 * "linkedin.com/in/<handle>" for the UI instead of the raw URL.
 */
export function linkedinDisplay(
  raw: string | null | undefined,
): { url: string; label: string } | null {
  if (!raw) return null;
  let value = raw.trim();
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  try {
    const u = new URL(value);
    const handleMatch = u.pathname.match(/\/in\/([^/]+)/i);
    const label = handleMatch
      ? `linkedin.com/in/${handleMatch[1]}`
      : u.host.replace(/^www\./, "") + u.pathname.replace(/\/$/, "");
    return { url: u.toString(), label };
  } catch {
    return null;
  }
}
