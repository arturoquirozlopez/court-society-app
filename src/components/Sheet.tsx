"use client";

import { useEffect } from "react";

/**
 * Bottom sheet modal. Used for: new challenge, log match, new visiting plan.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 flex items-end justify-center animate-[fadeIn_.2s]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-viewport bg-cs-ivory rounded-t-2xl max-h-[93vh] overflow-y-auto animate-[slideUp_.3s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-cs-green px-6 pt-6 pb-5">
          <div className="font-display italic text-[22px] text-cs-ivory">
            {title}
          </div>
          {subtitle && (
            <div className="text-[12px] text-cs-ivory/60 mt-1">{subtitle}</div>
          )}
        </div>
        <div className="px-6 pt-5 pb-10">{children}</div>
      </div>
    </div>
  );
}
