/**
 * Shared dark-green hero header used on landing/login/gate/apply screens.
 * Ports the prototype's `.pg-hero` / `.gate-hero` / `.land-hero` look.
 */
export function Hero({
  eyebrow = "C O U R T   S O C I E T Y",
  title,
  subtitle,
  size = "md",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  size?: "md" | "lg";
}) {
  return (
    <div
      className={`relative overflow-hidden bg-cs-green text-cs-ivory ${
        size === "lg" ? "px-7 pt-[52px] pb-11" : "px-7 pt-[52px] pb-7"
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none select-none absolute -bottom-5 -right-2 font-display italic leading-none text-white/[0.035]"
        style={{ fontSize: size === "lg" ? 180 : 140 }}
      >
        CS
      </div>
      <div className="label-eyebrow mb-5 text-cs-brass">{eyebrow}</div>
      <div className="font-display italic text-[30px] leading-[1.15] sm:text-[34px]">
        {title}
      </div>
      {subtitle ? (
        <div className="mt-2 text-[13px] text-cs-ivory/60 leading-relaxed">
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}
