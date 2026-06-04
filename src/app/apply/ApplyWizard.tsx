"use client";

import { useMemo, useState, useTransition } from "react";
import { submitApplication, type ApplicationFormValues } from "@/lib/actions/application";
import {
  type City,
  type Club,
  type Profile,
  type NominationByToken,
  LEVEL_LABEL,
  FORMAT_LABEL,
  FREQUENCY_LABEL,
  type PlayLevel,
  type PlayFormat,
  type PlayFrequency,
} from "@/lib/types";

/**
 * 4-step application wizard. Mirrors the prototype's TQ_STEPS but writes
 * to Supabase via the submitApplication server action.
 *
 * Steps: Club (city + club) · Tennis (level/format/frequency) · Contact
 *        (name/whatsapp/linkedin/headline) · Travel (cities + nominator)
 */
const STEPS = ["Club", "Tennis", "Contact", "Travel"] as const;

type Values = ApplicationFormValues;

export function ApplyWizard({
  profile,
  cities,
  clubs,
  nomination,
}: {
  profile: Profile;
  cities: City[];
  clubs: Club[];
  nomination: NominationByToken | null;
}) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Values>({
    full_name: profile.full_name ?? nomination?.nominee_name ?? "",
    headline: profile.headline ?? "",
    linkedin_url: profile.linkedin_url ?? "",
    gender: profile.gender ?? undefined,
    whatsapp: profile.whatsapp ?? "",
    home_city_id: profile.home_city_id ?? "",
    home_club_id: profile.home_club_id ?? "",
    other_club_name: profile.other_club_name ?? "",
    level: (profile.level ?? "intermediate") as PlayLevel,
    format: (profile.format ?? "singles") as PlayFormat,
    frequency: (profile.frequency ?? "weekly") as PlayFrequency,
    travel_city_ids: profile.travel_city_ids ?? [],
    nominated_by_text:
      profile.nominated_by_text ?? nomination?.nominator_name ?? "",
  });

  const set = <K extends keyof Values>(k: K, v: Values[K]) =>
    setValues((p) => ({ ...p, [k]: v }));

  const clubsForCity = useMemo(
    () => clubs.filter((c) => c.city_id === values.home_city_id),
    [clubs, values.home_city_id],
  );
  const selectedClub = clubs.find((c) => c.id === values.home_club_id);

  // Per-step validation
  const canNext = (() => {
    if (step === 0)
      return Boolean(
        values.home_city_id &&
          values.home_club_id &&
          (!selectedClub?.is_other || values.other_club_name?.trim()),
      );
    if (step === 1) return Boolean(values.level && values.format && values.frequency);
    if (step === 2) {
      const li = values.linkedin_url?.trim() ?? "";
      const liOk = /^https?:\/\/(www\.)?linkedin\.com\//i.test(li);
      return Boolean(
        values.full_name.trim().length >= 2 &&
          values.whatsapp.trim().length >= 6 &&
          liOk,
      );
    }
    if (step === 3) return true;
    return false;
  })();

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await submitApplication(values, {
        nominationId: nomination?.id ?? null,
      });
      if (!res.ok) setError(res.error);
      // success → server action redirects
    });
  }

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-10 bg-cs-ivory border-b border-black/10 flex items-center justify-between px-7 py-5">
        <button
          onClick={() => (step > 0 ? setStep((s) => s - 1) : history.back())}
          className="text-[10px] tracking-[0.15em] uppercase text-cs-muted hover:text-cs-black"
        >
          ← Back
        </button>
        <div className="font-display italic text-[12px] text-cs-brass">
          {step + 1} / {STEPS.length}
        </div>
      </header>

      <main className="flex-1 px-7 pt-9 pb-12 animate-[fadeUp_.35s_ease-out]" key={step}>
        {nomination && step === 0 && (
          <div className="mb-6 px-4 py-3 bg-cs-brass/[0.08] border-l-2 border-cs-brass">
            <div className="text-[9px] tracking-[0.2em] uppercase text-cs-brass mb-1">
              Nominated by
            </div>
            <div className="text-[13px] text-cs-green font-medium">
              {nomination.nominator_name}
            </div>
            {nomination.note && (
              <div className="text-[12px] italic text-cs-muted mt-1.5 leading-snug">
                &ldquo;{nomination.note}&rdquo;
              </div>
            )}
          </div>
        )}
        <div className="flex gap-1.5 mb-7">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-[2px] w-[18px] transition-colors ${
                i < step ? "bg-cs-green" : i === step ? "bg-cs-brass" : "bg-black/10"
              }`}
            />
          ))}
        </div>
        <div className="label-eyebrow mb-1.5">{STEPS[step]}</div>

        {step === 0 && (
          <StepClub
            values={values}
            cities={cities}
            clubs={clubsForCity}
            selectedClub={selectedClub}
            set={set}
          />
        )}
        {step === 1 && <StepTennis values={values} set={set} />}
        {step === 2 && <StepContact values={values} set={set} />}
        {step === 3 && <StepTravel values={values} cities={cities} set={set} />}

        {error && <p className="text-[12px] text-cs-loss mt-4">{error}</p>}

        <button
          onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : onSubmit())}
          disabled={!canNext || pending}
          className="btn-primary mt-6"
        >
          {pending
            ? "Submitting…"
            : step < STEPS.length - 1
              ? "Continue"
              : "Submit application"}
        </button>
      </main>
    </div>
  );
}

/* ────────── Step 1 — Club ────────── */
function StepClub({
  values,
  cities,
  clubs,
  selectedClub,
  set,
}: {
  values: Values;
  cities: City[];
  clubs: Club[];
  selectedClub: Club | undefined;
  set: <K extends keyof Values>(k: K, v: Values[K]) => void;
}) {
  return (
    <>
      <h1 className="font-display italic font-normal text-[30px] text-cs-green leading-[1.2] mb-1.5 whitespace-pre-line">
        {`Your club\nis your\ncredential.`}
      </h1>
      <p className="text-[13px] text-cs-muted leading-relaxed mb-7">
        Open to members of select private clubs in Santiago, São Paulo, and Miami.
      </p>
      <div className="border border-black/10 mb-3">
        <div className="px-4 py-4 border-b border-black/10 relative">
          <div className="text-[9px] tracking-[0.22em] uppercase text-cs-brass mb-1.5">
            City
          </div>
          <select
            value={values.home_city_id}
            onChange={(e) => {
              set("home_city_id", e.target.value);
              set("home_club_id", "");
              set("other_club_name", "");
            }}
            className="w-full bg-transparent font-display text-[17px] text-cs-green outline-none appearance-none"
          >
            <option value="">—</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="absolute right-4 top-1/2 translate-y-1 text-cs-brass text-[12px]">
            ⌄
          </span>
        </div>
        <div className="px-4 py-4 relative">
          <div className="text-[9px] tracking-[0.22em] uppercase text-cs-brass mb-1.5">
            Club membership
          </div>
          <select
            disabled={!values.home_city_id}
            value={values.home_club_id}
            onChange={(e) => {
              set("home_club_id", e.target.value);
              set("other_club_name", "");
            }}
            className="w-full bg-transparent font-display text-[17px] text-cs-green outline-none appearance-none disabled:text-cs-muted"
          >
            <option value="">—</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="absolute right-4 top-1/2 translate-y-1 text-cs-brass text-[12px]">
            ⌄
          </span>
        </div>
      </div>
      {selectedClub?.is_other && (
        <div className="mt-2">
          <label className="block text-[10px] tracking-[0.12em] uppercase text-cs-muted mb-1.5">
            Which club?
          </label>
          <input
            className="field-input"
            placeholder="Club name"
            value={values.other_club_name ?? ""}
            onChange={(e) => set("other_club_name", e.target.value)}
          />
        </div>
      )}
    </>
  );
}

/* ────────── Step 2 — Tennis ────────── */
function StepTennis({
  values,
  set,
}: {
  values: Values;
  set: <K extends keyof Values>(k: K, v: Values[K]) => void;
}) {
  return (
    <>
      <h1 className="font-display italic text-[30px] text-cs-green leading-[1.2] mb-1.5 whitespace-pre-line">
        {`How do\nyou play?`}
      </h1>
      <p className="text-[13px] text-cs-muted leading-relaxed mb-7">
        Honesty serves you here.
      </p>

      <Group label="Your level">
        {(Object.keys(LEVEL_LABEL) as PlayLevel[]).map((opt) => (
          <Radio
            key={opt}
            label={LEVEL_LABEL[opt]}
            selected={values.level === opt}
            onClick={() => set("level", opt)}
          />
        ))}
      </Group>

      <Group label="Singles, doubles, or both?">
        {(Object.keys(FORMAT_LABEL) as PlayFormat[]).map((opt) => (
          <Radio
            key={opt}
            label={FORMAT_LABEL[opt]}
            selected={values.format === opt}
            onClick={() => set("format", opt)}
          />
        ))}
      </Group>

      <Group label="How often do you play?">
        {(Object.keys(FREQUENCY_LABEL) as PlayFrequency[]).map((opt) => (
          <Radio
            key={opt}
            label={FREQUENCY_LABEL[opt]}
            selected={values.frequency === opt}
            onClick={() => set("frequency", opt)}
          />
        ))}
      </Group>
    </>
  );
}

/* ────────── Step 3 — Contact ────────── */
function StepContact({
  values,
  set,
}: {
  values: Values;
  set: <K extends keyof Values>(k: K, v: Values[K]) => void;
}) {
  return (
    <>
      <h1 className="font-display italic text-[30px] text-cs-green leading-[1.2] mb-1.5 whitespace-pre-line">
        {`Stay in\ntouch.`}
      </h1>
      <p className="text-[13px] text-cs-muted leading-relaxed mb-7">
        We use your number to coordinate matches — never to spam.
      </p>
      <Field label="Full name">
        <input
          className="field-input"
          value={values.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          placeholder="Your name"
          autoComplete="name"
        />
      </Field>
      <Field label="Role / headline">
        <input
          className="field-input"
          value={values.headline ?? ""}
          onChange={(e) => set("headline", e.target.value)}
          placeholder="e.g. Founder & CEO at Austral Ventures"
        />
      </Field>
      <Field label="WhatsApp with country code">
        <input
          className="field-input"
          value={values.whatsapp}
          onChange={(e) => set("whatsapp", e.target.value)}
          placeholder="+56912345678"
          inputMode="tel"
        />
      </Field>
      <Field label="LinkedIn profile URL">
        <input
          className="field-input"
          value={values.linkedin_url ?? ""}
          onChange={(e) => set("linkedin_url", e.target.value)}
          placeholder="https://linkedin.com/in/your-handle"
          inputMode="url"
        />
      </Field>
      <Field label="Gender — optional">
        <div className="flex gap-2 mt-1">
          {([
            { val: "M" as const, label: "Man" },
            { val: "F" as const, label: "Woman" },
            { val: undefined, label: "Prefer not to say" },
          ]).map((opt) => {
            const on = values.gender === opt.val;
            return (
              <button
                key={String(opt.val)}
                type="button"
                onClick={() => set("gender", opt.val)}
                className={`text-[11px] px-3 py-1.5 border ${
                  on
                    ? "border-cs-green bg-cs-green text-cs-ivory"
                    : "border-black/10 text-cs-muted"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-cs-muted mt-2 leading-snug">
          Used only to show you the ranking of your category by default. You can switch anytime.
        </p>
      </Field>
    </>
  );
}

/* ────────── Step 4 — Travel ────────── */
function StepTravel({
  values,
  cities,
  set,
}: {
  values: Values;
  cities: City[];
  set: <K extends keyof Values>(k: K, v: Values[K]) => void;
}) {
  const toggle = (id: string) => {
    const cur = values.travel_city_ids;
    set(
      "travel_city_ids",
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
    );
  };
  return (
    <>
      <h1 className="font-display italic text-[30px] text-cs-green leading-[1.2] mb-1.5 whitespace-pre-line">
        {`Where do\nyou land?`}
      </h1>
      <p className="text-[13px] text-cs-muted leading-relaxed mb-7">
        Select the cities you visit most. We&apos;ll surface matches there.
      </p>
      <Group label="Cities you travel to">
        <div className="flex flex-wrap gap-2">
          {cities.map((c) => {
            const on = values.travel_city_ids.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggle(c.id)}
                className={`text-[11px] px-3 py-1.5 border ${
                  on
                    ? "border-cs-green bg-cs-green text-cs-ivory"
                    : "border-black/10 text-cs-muted"
                }`}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      </Group>
      <Field label="Who nominated you? (optional)">
        <input
          className="field-input"
          value={values.nominated_by_text ?? ""}
          onChange={(e) => set("nominated_by_text", e.target.value)}
          placeholder="Name, or leave blank"
        />
      </Field>
    </>
  );
}

/* ────────── primitives ────────── */
function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <label className="block text-[10px] tracking-[0.12em] uppercase text-cs-muted mb-2">
        {label}
      </label>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <label className="block text-[10px] tracking-[0.12em] uppercase text-cs-muted mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function Radio({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 py-3 border-b border-black/5 text-left"
    >
      <span
        className={`w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center ${
          selected ? "border-cs-green" : "border-black/20"
        }`}
      >
        {selected && <span className="w-2 h-2 rounded-full bg-cs-green" />}
      </span>
      <span className="text-[14px] text-cs-black leading-snug">{label}</span>
    </button>
  );
}
