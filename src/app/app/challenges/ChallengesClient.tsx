"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { Sheet } from "@/components/Sheet";
import {
  acceptChallenge,
  cancelChallenge,
  createChallenge,
  passChallenge,
} from "@/lib/actions/challenges";
import { fmtRel, hoursLeft, waLink } from "@/lib/format";
import {
  LEVEL_SHORT,
  FORMAT_LABEL,
  type PlayFormat,
  type PlayLevel,
  type Profile,
} from "@/lib/types";

type Chal = {
  id: string;
  author_id: string;
  city_id: string;
  level: string;
  format: string;
  note: string | null;
  status: string;
  accepted_by: string | null;
  expires_at: string;
  created_at: string;
};

export function ChallengesClient({
  meId,
  meLevel,
  meHomeClubId,
  defaultCityId,
  cities,
  clubs,
  challenges,
  clubsByChallenge,
  peopleById,
}: {
  meId: string;
  meLevel: PlayLevel | null;
  meHomeClubId: string | null;
  defaultCityId: string | null;
  cities: { id: string; name: string }[];
  clubs: { id: string; name: string; city_id: string }[];
  challenges: Chal[];
  clubsByChallenge: Record<string, string[]>;
  peopleById: Record<string, Profile>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [cityId, setCityId] = useState<string>(defaultCityId ?? "");
  const [level, setLevel] = useState<PlayLevel>(meLevel ?? "intermediate");
  const [format, setFormat] = useState<PlayFormat>("singles");
  const [clubIds, setClubIds] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const cityClubs = clubs.filter((c) => c.city_id === cityId);

  function submit() {
    setError(null);
    start(async () => {
      const res = await createChallenge({
        city_id: cityId,
        level,
        format,
        club_ids: clubIds,
        note,
      });
      if (!res.ok) setError(res.error);
      else {
        setOpen(false);
        setClubIds([]);
        setNote("");
      }
    });
  }

  return (
    <>
      <div>
        {challenges.length === 0 && (
          <div className="px-7 py-12 text-center">
            <div className="font-display italic text-[18px] text-cs-green">
              No active challenges.
            </div>
            <div className="text-[12px] text-cs-muted mt-2 leading-relaxed">
              Tap ⚔ to post the first one.
            </div>
          </div>
        )}
        {challenges.map((ch) => {
          const ismine = ch.author_id === meId;
          const author = ismine ? null : peopleById[ch.author_id];
          const acceptor = ch.accepted_by && ch.accepted_by !== meId
            ? peopleById[ch.accepted_by] ?? null
            : null;
          const hrs = hoursLeft(ch.expires_at);
          const accepted = ch.status === "accepted";
          const clubNames = (clubsByChallenge[ch.id] ?? [])
            .map((id) => clubs.find((c) => c.id === id)?.name)
            .filter(Boolean) as string[];

          return (
            <article key={ch.id} className="px-7 py-5 border-b border-black/10">
              <header className="flex items-center gap-3 mb-3">
                <Link
                  href={author ? `/app/members/${author.id}` : "#"}
                  className="flex-shrink-0"
                >
                  <Avatar
                    url={ismine ? null : author?.photo_url}
                    seed={ch.author_id}
                    size={40}
                  />
                </Link>
                <div className="flex-1">
                  <div className="text-[13px] font-medium">
                    {ismine ? "You" : author?.full_name ?? "—"}
                  </div>
                  <div className="text-[10px] text-cs-muted">{fmtRel(ch.created_at)}</div>
                </div>
                {ismine && (
                  <span className="text-[9px] tracking-wider uppercase text-cs-brass px-2 py-0.5 border border-cs-brass/40">
                    Your reto
                  </span>
                )}
              </header>

              <div className="bg-cs-green/[0.04] border-l-2 border-cs-brass px-4 py-3.5">
                <div className="font-display italic text-[18px] text-cs-green">
                  {cities.find((c) => c.id === ch.city_id)?.name}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <Tag tone="level">{LEVEL_SHORT[ch.level as PlayLevel]}</Tag>
                  <Tag>{FORMAT_LABEL[ch.format as PlayFormat]}</Tag>
                  {clubNames.slice(0, 3).map((n) => (
                    <Tag key={n} tone="club">
                      {n.split(" ").slice(-1)[0]}
                    </Tag>
                  ))}
                </div>
                {ch.note && (
                  <p className="text-[12px] text-cs-black/70 italic mt-2.5 leading-snug">
                    “{ch.note}”
                  </p>
                )}
                <div
                  className={`text-[10px] mt-2 tracking-[0.04em] ${
                    hrs <= 12 ? "text-[#c0560a]" : "text-cs-muted"
                  }`}
                >
                  ⏱ {hrs}h remaining
                </div>
              </div>

              {/* Actions */}
              {ch.status === "open" && !ismine && (
                <div className="flex gap-2 mt-3.5">
                  <button
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await acceptChallenge(ch.id);
                        if (res.ok && author?.whatsapp) {
                          const msg = `Hi ${author.full_name?.split(" ")[0]}! I accepted your Court Society challenge in ${
                            cities.find((c) => c.id === ch.city_id)?.name
                          }.`;
                          window.open(waLink(author.whatsapp, msg), "_blank");
                        }
                      })
                    }
                    className="flex-1 py-2.5 bg-cs-green text-cs-ivory text-[10px] tracking-wider uppercase relative"
                  >
                    Accept
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-cs-brass" />
                  </button>
                  <button
                    disabled={pending}
                    onClick={() => start(() => passChallenge(ch.id).then(() => {}))}
                    className="px-4 py-2.5 border border-black/10 text-cs-muted text-[10px] tracking-wider uppercase hover:text-cs-black"
                  >
                    Pass
                  </button>
                </div>
              )}

              {ch.status === "open" && ismine && (
                <div className="mt-3 px-4 py-2.5 bg-cs-brass/[0.07] border-l-2 border-cs-brass flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[9px] tracking-wider uppercase text-cs-brass">
                      Waiting for acceptance
                    </div>
                    <div className="text-[12px] text-cs-muted">
                      First to accept makes the match.
                    </div>
                  </div>
                  <button
                    disabled={pending}
                    onClick={() => start(() => cancelChallenge(ch.id).then(() => {}))}
                    className="text-[10px] tracking-[0.1em] uppercase text-cs-muted hover:text-cs-loss"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {accepted && (
                <div className="mt-3 px-4 py-3 bg-cs-green text-cs-ivory flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cs-brassLight mt-1" />
                  <div>
                    <div className="text-[12px] text-cs-brassLight font-medium tracking-[0.04em]">
                      Match accepted{ch.accepted_by === meId
                        ? " by you"
                        : acceptor
                          ? ` by ${acceptor.full_name}`
                          : ""}
                    </div>
                    {acceptor?.whatsapp && (
                      <a
                        href={waLink(
                          acceptor.whatsapp,
                          `Hi ${acceptor.full_name?.split(" ")[0]}! Accepted your Court Society challenge.`,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 bg-[#25D366] text-white text-[10px] tracking-wider uppercase"
                      >
                        💬 WhatsApp {acceptor.full_name?.split(" ")[0]}
                      </a>
                    )}
                    {ch.accepted_by === meId && author?.whatsapp && (
                      <a
                        href={waLink(
                          author.whatsapp,
                          `Hi ${author.full_name?.split(" ")[0]}! I accepted your Court Society challenge.`,
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 bg-[#25D366] text-white text-[10px] tracking-wider uppercase"
                      >
                        💬 WhatsApp {author.full_name?.split(" ")[0]}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[86px] right-[max(calc(50%-200px),16px)] w-14 h-14 bg-cs-green text-cs-ivory text-2xl flex items-center justify-center shadow-lg z-30"
        aria-label="New challenge"
      >
        ⚔
      </button>

      {/* Sheet */}
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="New reto"
        subtitle="Broadcast a match — first to accept makes the game."
      >
        <Field label="City">
          <select
            className="field-input"
            value={cityId}
            onChange={(e) => {
              setCityId(e.target.value);
              setClubIds([]);
            }}
          >
            <option value="">—</option>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        {cityId && (
          <Field label="Preferred clubs (pick any)">
            {cityClubs.map((cl) => {
              const on = clubIds.includes(cl.id);
              const isHome = cl.id === meHomeClubId;
              return (
                <label
                  key={cl.id}
                  className="flex items-center gap-3 py-2.5 border-b border-black/5 cursor-pointer"
                >
                  <span
                    className={`w-[18px] h-[18px] border-[1.5px] flex items-center justify-center ${
                      on ? "bg-cs-green border-cs-green text-cs-ivory" : "border-black/20"
                    }`}
                  >
                    {on && "✓"}
                  </span>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() =>
                      setClubIds((prev) =>
                        on ? prev.filter((x) => x !== cl.id) : [...prev, cl.id],
                      )
                    }
                  />
                  <span className="text-[13px]">
                    {cl.name}
                    {isHome ? " ★" : ""}
                  </span>
                </label>
              );
            })}
          </Field>
        )}

        <Field label="Format">
          <div className="flex gap-2">
            {(["singles", "doubles", "both"] as PlayFormat[]).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`text-[11px] px-3 py-1.5 border ${
                  format === f
                    ? "border-cs-green bg-cs-green text-cs-ivory"
                    : "border-black/10 text-cs-muted"
                }`}
              >
                {FORMAT_LABEL[f]}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Note (optional)">
          <textarea
            className="field-input min-h-[64px] resize-none"
            placeholder="Availability, preferred time…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>

        {error && <p className="text-[12px] text-cs-loss mb-2">{error}</p>}
        <button
          onClick={submit}
          disabled={!cityId || pending}
          className="btn-primary"
        >
          {pending ? "Posting…" : "Post challenge"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="block w-full text-center text-[12px] text-cs-muted py-3.5 mt-1"
        >
          Cancel
        </button>
      </Sheet>
    </>
  );
}

function Tag({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "level" | "club";
}) {
  const color =
    tone === "level"
      ? "border-cs-brass text-cs-brass"
      : tone === "club"
        ? "border-cs-green/30 text-cs-green"
        : "border-black/10 text-cs-muted";
  return (
    <span className={`text-[9.5px] tracking-wider uppercase px-2 py-0.5 border ${color}`}>
      {children}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className="block text-[10px] tracking-[0.12em] uppercase text-cs-muted mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
