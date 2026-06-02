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
