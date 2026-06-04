import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { hoursLeft } from "@/lib/format";
import { FORMAT_LABEL, LEVEL_SHORT, type Profile } from "@/lib/types";

type Chal = {
  id: string;
  author_id: string;
  city_id: string;
  level: string;
  format: string;
  note: string | null;
  status: string;
  accepted_by: string | null;
  target_id: string | null;
  expires_at: string;
  created_at: string;
};

/**
 * Right-rail for the Challenges desktop layout.
 *
 * Splits the same `challenges` array into the three lists a member cares
 * about: open challenges I posted, accepted ones I'm playing, and direct
 * challenges where the other side hasn't replied yet.
 */
export function ChallengesRail({
  meId,
  challenges,
  peopleById,
  activeCityName,
}: {
  meId: string;
  challenges: Chal[];
  peopleById: Record<string, Profile>;
  activeCityName: string;
}) {
  const myOpen = challenges.filter(
    (c) => c.author_id === meId && c.status === "open" && !c.target_id,
  );
  const myDirectAwaiting = challenges.filter(
    (c) => c.author_id === meId && c.status === "open" && c.target_id,
  );
  const accepted = challenges.filter(
    (c) =>
      c.status === "accepted" &&
      (c.author_id === meId || c.accepted_by === meId),
  );

  const stats = {
    open: myOpen.length + myDirectAwaiting.length,
    accepted: accepted.length,
  };

  return (
    <aside className="border-l border-cs-green/10 bg-[#FBF8F0] px-7 py-10 flex flex-col gap-8">
      {/* Header card */}
      <div>
        <div className="text-[10px] tracking-[0.28em] uppercase text-cs-brass">
          Y o u r s
        </div>
        <h2 className="font-display italic text-[20px] text-cs-green mt-2">
          {activeCityName || "—"}
        </h2>
        <div className="grid grid-cols-2 gap-px bg-cs-green/10 border border-cs-green/10 mt-4">
          <RailStat label="Open by you" value={stats.open} />
          <RailStat label="Accepted" value={stats.accepted} />
        </div>
      </div>

      {/* Open by you */}
      <RailSection title="Open by you">
        {myOpen.length === 0 ? (
          <Empty>No active open challenges.</Empty>
        ) : (
          myOpen.map((c) => (
            <div
              key={c.id}
              className="py-2.5 border-b border-cs-green/10 last:border-b-0"
            >
              <div className="text-[13px] text-cs-green">
                {FORMAT_LABEL[c.format as keyof typeof FORMAT_LABEL] ?? c.format}
                {" · "}
                <span className="text-cs-muted">
                  Level {LEVEL_SHORT[c.level as keyof typeof LEVEL_SHORT] ?? c.level}
                </span>
              </div>
              {c.note && (
                <div className="text-[11px] text-cs-muted italic mt-1 line-clamp-2">
                  &ldquo;{c.note}&rdquo;
                </div>
              )}
              <div className="text-[10px] tracking-[0.16em] uppercase text-cs-brass mt-1.5">
                {hoursLeft(c.expires_at)} h left
              </div>
            </div>
          ))
        )}
      </RailSection>

      {/* Accepted */}
      <RailSection title="Accepted">
        {accepted.length === 0 ? (
          <Empty>No accepted challenges waiting to be played.</Empty>
        ) : (
          accepted.map((c) => {
            const otherId = c.author_id === meId ? c.accepted_by : c.author_id;
            const other = otherId ? peopleById[otherId] : null;
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 py-2.5 border-b border-cs-green/10 last:border-b-0"
              >
                <Avatar
                  url={other?.photo_url}
                  seed={other?.id ?? otherId ?? ""}
                  alt={other?.full_name ?? ""}
                  size={28}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-cs-green truncate">
                    vs {other?.full_name ?? "—"}
                  </div>
                  <div className="text-[10px] text-cs-muted">
                    {FORMAT_LABEL[c.format as keyof typeof FORMAT_LABEL] ??
                      c.format}
                  </div>
                </div>
                <Link
                  href="#feed"
                  className="text-[10px] tracking-[0.16em] uppercase text-cs-brass"
                >
                  Log
                </Link>
              </div>
            );
          })
        )}
      </RailSection>

      {/* Awaiting reply */}
      <RailSection title="Awaiting reply">
        {myDirectAwaiting.length === 0 ? (
          <Empty>No direct challenges out.</Empty>
        ) : (
          myDirectAwaiting.map((c) => {
            const target = c.target_id ? peopleById[c.target_id] : null;
            return (
              <div
                key={c.id}
                className="flex items-center gap-3 py-2.5 border-b border-cs-green/10 last:border-b-0"
              >
                <Avatar
                  url={target?.photo_url}
                  seed={target?.id ?? c.target_id ?? ""}
                  alt={target?.full_name ?? ""}
                  size={28}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-cs-green truncate">
                    {target?.full_name ?? "—"}
                  </div>
                  <div className="text-[10px] text-cs-brass">
                    Direct · sent {relTime(c.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </RailSection>
    </aside>
  );
}

/* ────────── helpers ────────── */

function relTime(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days >= 1) return `${days}d ago`;
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (hours >= 1) return `${hours}h ago`;
  return "just now";
}

function RailStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[#FBF8F0] px-4 py-3.5">
      <div className="text-[10px] tracking-[0.2em] uppercase text-cs-muted">
        {label}
      </div>
      <div className="font-display italic text-[24px] text-cs-green leading-none mt-2">
        {value}
      </div>
    </div>
  );
}

function RailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-display italic text-[18px] text-cs-green mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-[12px] text-cs-muted">{children}</p>;
}
