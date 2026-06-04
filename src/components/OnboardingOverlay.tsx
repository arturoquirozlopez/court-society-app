"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { completeOnboarding } from "@/lib/actions/onboarding";

/**
 * Two surfaces in one component:
 *  1. A fixed `ⓘ` icon in the top-right corner of the viewport so members
 *     can re-open the guide anytime.
 *  2. A full-screen overlay with 5 slides. Auto-opens the first time a
 *     newly approved member enters the app; afterwards only opens by tap
 *     on the ⓘ icon.
 *
 * `completeOnboarding` is called exactly once per first-time visit
 * (skip or finish — both close the flow and persist the flag).
 */
export function OnboardingOverlay({
  autoShow,
  cities,
}: {
  autoShow: boolean;
  cities: string[];
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [, start] = useTransition();
  const persistedRef = useRef(false);

  const slides = buildSlides(cities);

  // First-time auto-open
  useEffect(() => {
    if (autoShow) setOpen(true);
  }, [autoShow]);

  function close(persist: boolean) {
    setOpen(false);
    setStep(0);
    if (persist && autoShow && !persistedRef.current) {
      persistedRef.current = true;
      start(() => {
        completeOnboarding().then(() => {});
      });
    }
  }

  const last = step === slides.length - 1;

  return (
    <>
      {/* Top-right help icon, sized to the 430px viewport */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-viewport z-30 pointer-events-none">
        <button
          onClick={() => {
            setStep(0);
            setOpen(true);
          }}
          aria-label="How Court Society works"
          className="absolute top-3 right-3 pointer-events-auto w-9 h-9 rounded-full border border-cs-brass/50 bg-cs-ivory/90 backdrop-blur flex items-center justify-center text-cs-green hover:border-cs-green transition-colors shadow-sm"
        >
          <span className="font-display italic text-[15px] leading-none translate-y-[1px]">
            i
          </span>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-cs-ivory flex flex-col animate-[fadeIn_.25s_ease-out]"
          role="dialog"
          aria-modal="true"
          aria-label="Court Society onboarding"
        >
          {/* Header: progress dots + skip */}
          <header className="flex items-center justify-between px-7 pt-5 pb-3">
            <div className="flex gap-1.5">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`h-[2px] w-5 transition-colors ${
                    i < step
                      ? "bg-cs-green"
                      : i === step
                        ? "bg-cs-brass"
                        : "bg-black/10"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={() => close(true)}
              className="text-[10px] tracking-[0.15em] uppercase text-cs-muted hover:text-cs-black"
            >
              {autoShow ? "Skip" : "Close"}
            </button>
          </header>

          {/* Slide */}
          <main
            key={step}
            className="flex-1 flex flex-col items-center justify-center px-7 pb-6 animate-[fadeUp_.35s_ease-out]"
          >
            <div className="text-[9px] tracking-[0.32em] uppercase text-cs-brass mb-8">
              {slides[step].eyebrow}
            </div>

            <div className="mb-10 flex items-center justify-center min-h-[140px]">
              {slides[step].visual}
            </div>

            <h2 className="font-display italic text-[28px] sm:text-[30px] text-cs-green leading-[1.15] text-center max-w-[320px] mb-4">
              {slides[step].title}
            </h2>
            <p className="text-[14px] text-cs-black/75 leading-[1.7] text-center max-w-[320px]">
              {slides[step].body}
            </p>
          </main>

          {/* Footer nav */}
          <footer className="px-7 pb-9 pt-2">
            <div className="flex gap-2.5">
              {step > 0 && (
                <button
                  onClick={() => setStep((s) => s - 1)}
                  className="flex-1 py-3.5 border border-black/15 text-cs-muted text-[11px] tracking-[0.18em] uppercase hover:text-cs-black hover:border-cs-black/30 transition-colors"
                >
                  ← Back
                </button>
              )}
              {!last ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  className="flex-1 py-3.5 bg-cs-green text-cs-ivory text-[11px] tracking-[0.2em] uppercase relative"
                >
                  Continue →
                  <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-cs-brass" />
                </button>
              ) : (
                <button
                  onClick={() => close(true)}
                  className="flex-1 py-3.5 bg-cs-green text-cs-ivory text-[11px] tracking-[0.2em] uppercase relative"
                >
                  Start playing
                  <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-cs-brass" />
                </button>
              )}
            </div>
          </footer>
        </div>
      )}
    </>
  );
}

/* ────────── slides ────────── */

function buildSlides(cities: string[]): {
  eyebrow: string;
  title: string;
  body: string;
  visual: React.ReactNode;
}[] {
  return [
    {
      eyebrow: "C O U R T    S O C I E T Y",
      title: "Your global private tennis network.",
      body: "Connect with verified members, challenge players, build rivalries and find matches anywhere you travel.",
      visual: <VisualNetwork cities={cities} />,
    },
    {
      eyebrow: "Challenge",
      title: "Find your next match.",
      body: "Browse members in your city or the city you’re visiting and send a challenge with one tap.",
      visual: <VisualChallenge />,
    },
    {
      eyebrow: "Ranking",
      title: "Every match counts.",
      body: "Confirmed match results affect rankings, rivalries and season standings.",
      visual: <VisualRanking />,
    },
    {
      eyebrow: "Travel",
      title: "Play anywhere.",
      body: "When you travel, update your current city and discover local members ready to play.",
      visual: <VisualTravel cities={cities} />,
    },
    {
      eyebrow: "Head to Head",
      title: "Build rivalries.",
      body: "Track your history against other members, compare records and see who leads the rivalry.",
      visual: <VisualH2H />,
    },
  ];
}

/* ────────── visuals ────────── */

function VisualNetwork({ cities }: { cities: string[] }) {
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 240 80" className="w-56 h-20" aria-hidden>
        <line
          x1="36"
          y1="40"
          x2="204"
          y2="40"
          stroke="#A68B5B"
          strokeDasharray="2 4"
          strokeWidth="1"
        />
        <circle cx="36" cy="40" r="10" fill="#0E2A1F" />
        <circle cx="120" cy="40" r="14" fill="#A68B5B" />
        <circle cx="204" cy="40" r="10" fill="#0E2A1F" />
        <text
          x="120"
          y="44"
          textAnchor="middle"
          fontFamily="Playfair Display, serif"
          fontStyle="italic"
          fontSize="13"
          fill="#F5F1E8"
        >
          CS
        </text>
      </svg>
      {cities.length > 0 && (
        <div className="flex flex-wrap justify-center gap-x-7 gap-y-1 text-[9px] tracking-[0.22em] uppercase text-cs-brass mt-2 max-w-[280px]">
          {cities.map((c) => (
            <span key={c}>{c}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function VisualChallenge() {
  return (
    <svg viewBox="0 0 240 100" className="w-56 h-24" aria-hidden>
      <circle
        cx="60"
        cy="50"
        r="26"
        fill="none"
        stroke="#0E2A1F"
        strokeWidth="1.5"
      />
      <circle cx="60" cy="42" r="8" fill="#0E2A1F" />
      <path d="M 44 64 Q 60 54 76 64" stroke="#0E2A1F" strokeWidth="1.5" fill="none" />
      <text
        x="120"
        y="56"
        textAnchor="middle"
        fontSize="24"
        fill="#A68B5B"
      >
        ⚔
      </text>
      <circle
        cx="180"
        cy="50"
        r="26"
        fill="none"
        stroke="#0E2A1F"
        strokeWidth="1.5"
        strokeDasharray="3 3"
      />
      <text
        x="180"
        y="54"
        textAnchor="middle"
        fontFamily="Playfair Display, serif"
        fontStyle="italic"
        fontSize="14"
        fill="#0E2A1F"
      >
        ?
      </text>
    </svg>
  );
}

function VisualRanking() {
  return (
    <svg viewBox="0 0 240 110" className="w-56 h-28" aria-hidden>
      {/* Bars */}
      <rect x="40" y="60" width="40" height="40" fill="#0E2A1F" opacity=".25" />
      <rect x="100" y="30" width="40" height="70" fill="#0E2A1F" />
      <rect x="160" y="75" width="40" height="25" fill="#0E2A1F" opacity=".15" />
      {/* Position labels */}
      <text
        x="60"
        y="56"
        textAnchor="middle"
        fontFamily="Playfair Display, serif"
        fontSize="14"
        fill="#A68B5B"
      >
        #2
      </text>
      <text
        x="120"
        y="26"
        textAnchor="middle"
        fontFamily="Playfair Display, serif"
        fontSize="18"
        fill="#A68B5B"
      >
        #1
      </text>
      <text
        x="180"
        y="71"
        textAnchor="middle"
        fontFamily="Playfair Display, serif"
        fontSize="13"
        fill="#A68B5B"
      >
        #3
      </text>
    </svg>
  );
}

function VisualTravel({ cities }: { cities: string[] }) {
  // Picks two active cities to illustrate "home → visiting". Falls back to
  // a single tile if only one city is active.
  const from = (cities[0] ?? "Home").toUpperCase();
  const to = (cities[1] ?? cities[0] ?? "Away").toUpperCase();
  const fit = (s: string) => (s.length > 11 ? s.slice(0, 10) + "…" : s);
  return (
    <svg viewBox="0 0 260 80" className="w-64 h-20" aria-hidden>
      <rect
        x="10"
        y="28"
        width="84"
        height="32"
        rx="2"
        fill="none"
        stroke="#0E2A1F"
        strokeWidth="1"
      />
      <text
        x="52"
        y="48"
        textAnchor="middle"
        fontSize="10"
        fontFamily="DM Sans, sans-serif"
        fill="#0E2A1F"
        letterSpacing="2"
      >
        {fit(from)}
      </text>
      <line
        x1="106"
        y1="44"
        x2="154"
        y2="44"
        stroke="#A68B5B"
        strokeDasharray="3 3"
      />
      <text x="130" y="36" textAnchor="middle" fontSize="14" fill="#A68B5B">
        ✈
      </text>
      <rect x="166" y="28" width="84" height="32" rx="2" fill="#0E2A1F" />
      <text
        x="208"
        y="48"
        textAnchor="middle"
        fontSize="10"
        fontFamily="DM Sans, sans-serif"
        fill="#F5F1E8"
        letterSpacing="2"
      >
        {fit(to)}
      </text>
    </svg>
  );
}

function VisualH2H() {
  return (
    <svg viewBox="0 0 240 100" className="w-56 h-24" aria-hidden>
      <circle
        cx="48"
        cy="50"
        r="22"
        fill="none"
        stroke="#0E2A1F"
        strokeWidth="1.5"
      />
      <circle cx="48" cy="44" r="7" fill="#0E2A1F" />
      <path d="M 35 63 Q 48 55 61 63" stroke="#0E2A1F" strokeWidth="1.5" fill="none" />
      <text
        x="120"
        y="62"
        textAnchor="middle"
        fontFamily="Playfair Display, serif"
        fontSize="34"
        fill="#0E2A1F"
      >
        7
      </text>
      <text
        x="140"
        y="56"
        textAnchor="middle"
        fontFamily="Playfair Display, serif"
        fontSize="22"
        fill="#A68B5B"
      >
        —
      </text>
      <text
        x="160"
        y="62"
        textAnchor="middle"
        fontFamily="Playfair Display, serif"
        fontSize="34"
        fill="#0E2A1F"
        opacity=".4"
      >
        4
      </text>
      <circle
        cx="192"
        cy="50"
        r="22"
        fill="none"
        stroke="#0E2A1F"
        strokeWidth="1.5"
        opacity=".4"
      />
      <circle cx="192" cy="44" r="7" fill="#0E2A1F" opacity=".4" />
      <path
        d="M 179 63 Q 192 55 205 63"
        stroke="#0E2A1F"
        strokeWidth="1.5"
        fill="none"
        opacity=".4"
      />
    </svg>
  );
}
