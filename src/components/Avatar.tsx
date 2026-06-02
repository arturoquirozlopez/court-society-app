/**
 * Round avatar. Falls back to dicebear if no photo_url.
 */
export function Avatar({
  url,
  seed,
  alt = "",
  size = 44,
}: {
  url?: string | null;
  seed?: string;
  alt?: string;
  size?: number;
}) {
  const src =
    url ||
    `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(
      seed ?? "default",
    )}`;
  return (
    <span
      className="inline-block rounded-full overflow-hidden border border-black/10 flex-shrink-0 bg-cs-ivory"
      style={{ width: size, height: size }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </span>
  );
}
