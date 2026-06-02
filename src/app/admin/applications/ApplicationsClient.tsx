"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Avatar } from "@/components/Avatar";
import { fmtDate } from "@/lib/format";
import {
  LEVEL_LABEL,
  FORMAT_LABEL,
  FREQUENCY_LABEL,
  type Application,
  type City,
  type Club,
  type MemberStatus,
  type Profile,
} from "@/lib/types";
import { reviewApplication } from "@/lib/actions/admin";

type ApplicationPayload = {
  full_name?: string;
  headline?: string;
  linkedin_url?: string;
  whatsapp?: string;
  level?: keyof typeof LEVEL_LABEL;
  format?: keyof typeof FORMAT_LABEL;
  frequency?: keyof typeof FREQUENCY_LABEL;
  travel_city_ids?: string[];
  nominated_by_text?: string;
  other_club_name?: string;
};

const FILTERS: { v: MemberStatus | "all"; label: string }[] = [
  { v: "pending",    label: "Pending" },
  { v: "approved",   label: "Approved" },
  { v: "waitlisted", label: "Waitlist" },
  { v: "rejected",   label: "Rejected" },
  { v: "all",        label: "All" },
];

export function ApplicationsClient({
  filter,
  applications,
  profileById,
  cityById,
  clubById,
}: {
  filter: MemberStatus | "all";
  applications: Application[];
  profileById: Record<string, Profile>;
  cityById: Record<string, { name: string; slug: string }>;
  clubById: Record<string, { name: string; city_id: string; is_other: boolean }>;
}) {
  return (
    <div>
      <div className="flex gap-1.5 px-7 py-3 overflow-x-auto border-b border-black/10 scrollbar-none">
        {FILTERS.map((f) => (
          <Link
            key={f.v}
            href={`/admin/applications?status=${f.v}`}
            className={`text-[10px] tracking-[0.12em] uppercase px-3 py-1.5 border whitespace-nowrap ${
              filter === f.v
                ? "border-cs-green bg-cs-green text-cs-ivory"
                : "border-black/10 text-cs-muted hover:text-cs-black"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {applications.length === 0 && (
        <div className="px-7 py-16 text-center">
          <div className="font-display italic text-[18px] text-cs-green">
            No applications.
          </div>
          <div className="text-[12px] text-cs-muted mt-2 leading-relaxed">
            New applications appear here.
          </div>
        </div>
      )}

      <ul>
        {applications.map((a) => {
          const p = profileById[a.profile_id];
          const payload = a.payload as ApplicationPayload;
          return (
            <ApplicationRow
              key={a.id}
              application={a}
              profile={p}
              payload={payload}
              cityById={cityById}
              clubById={clubById}
            />
          );
        })}
      </ul>
    </div>
  );
}

function ApplicationRow({
  application,
  profile,
  payload,
  cityById,
  clubById,
}: {
  application: Application;
  profile?: Profile;
  payload: ApplicationPayload;
  cityById: Record<string, { name: string; slug: string }>;
  clubById: Record<string, { name: string; city_id: string; is_other: boolean }>;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const cityName =
    profile?.home_city_id ? cityById[profile.home_city_id]?.name ?? "—" : "—";
  const clubName =
    profile?.home_club_id
      ? clubById[profile.home_club_id]?.is_other && profile.other_club_name
        ? profile.other_club_name
        : clubById[profile.home_club_id]?.name ?? "—"
      : "—";

  function review(status: "approved" | "waitlisted" | "rejected") {
    setMsg(null);
    start(async () => {
      const res = await reviewApplication({
        applicationId: application.id,
        status,
        note,
      });
      if (!res.ok) setMsg(res.error);
    });
  }

  return (
    <li className="border-b border-black/10 px-7 py-5">
      <div className="flex items-start gap-3">
        <Avatar
          url={profile?.photo_url}
          seed={application.profile_id}
          alt={profile?.full_name ?? ""}
          size={44}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusChip status={application.status} />
            <span className="text-[13.5px] font-medium">
              {profile?.full_name ?? payload.full_name ?? "—"}
            </span>
          </div>
          <div className="text-[11px] text-cs-muted mt-1">
            {clubName} · {cityName}
          </div>
          <div className="text-[11px] text-cs-muted mt-0.5">
            {profile?.email} · {fmtDate(application.created_at)}
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            className="mt-2 text-[10px] tracking-[0.15em] uppercase text-cs-brass hover:text-cs-green"
          >
            {open ? "Hide details" : "View details"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] text-cs-black">
          <Detail l="Headline" v={payload.headline ?? profile?.headline ?? "—"} />
          <Detail l="WhatsApp" v={payload.whatsapp ?? profile?.whatsapp ?? "—"} />
          <Detail l="LinkedIn" v={payload.linkedin_url ?? profile?.linkedin_url ?? "—"} />
          <Detail
            l="Level"
            v={payload.level ? LEVEL_LABEL[payload.level] : profile?.level ? LEVEL_LABEL[profile.level] : "—"}
          />
          <Detail
            l="Format"
            v={payload.format ? FORMAT_LABEL[payload.format] : profile?.format ? FORMAT_LABEL[profile.format] : "—"}
          />
          <Detail
            l="Frequency"
            v={payload.frequency ? FREQUENCY_LABEL[payload.frequency] : profile?.frequency ? FREQUENCY_LABEL[profile.frequency] : "—"}
          />
          <Detail
            l="Travel"
            v={
              (payload.travel_city_ids ?? profile?.travel_city_ids ?? [])
                .map((id) => cityById[id]?.name)
                .filter(Boolean)
                .join(", ") || "—"
            }
          />
          <Detail
            l="Nominated by"
            v={payload.nominated_by_text ?? profile?.nominated_by_text ?? "—"}
          />
        </div>
      )}

      {application.status === "pending" && (
        <div className="mt-4">
          <textarea
            className="field-input min-h-[48px] resize-none"
            placeholder="Reviewer note (optional, sent to applicant)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex gap-2 mt-2.5">
            <button
              disabled={pending}
              onClick={() => review("approved")}
              className="px-3.5 py-2 bg-cs-green text-cs-ivory text-[10px] tracking-[0.12em] uppercase"
            >
              Approve
            </button>
            <button
              disabled={pending}
              onClick={() => review("waitlisted")}
              className="px-3.5 py-2 border border-cs-brass text-cs-brass text-[10px] tracking-[0.12em] uppercase"
            >
              Waitlist
            </button>
            <button
              disabled={pending}
              onClick={() => review("rejected")}
              className="px-3.5 py-2 border border-cs-loss text-cs-loss text-[10px] tracking-[0.12em] uppercase"
            >
              Reject
            </button>
          </div>
          {msg && <p className="text-[12px] text-cs-loss mt-2">{msg}</p>}
        </div>
      )}

      {application.status !== "pending" && application.review_note && (
        <p className="mt-3 text-[12px] text-cs-muted border-l-2 border-cs-brass pl-3">
          {application.review_note}
        </p>
      )}
    </li>
  );
}

function StatusChip({ status }: { status: MemberStatus }) {
  const styles: Record<MemberStatus, string> = {
    pending:    "bg-cs-warn/[0.12] text-cs-warn",
    approved:   "bg-cs-green/[0.1] text-cs-green",
    waitlisted: "bg-cs-brass/[0.12] text-cs-brass",
    rejected:   "bg-cs-loss/[0.1] text-cs-loss",
  };
  return (
    <span className={`text-[9px] tracking-[0.15em] uppercase px-2 py-0.5 ${styles[status]}`}>
      {status}
    </span>
  );
}

function Detail({ l, v }: { l: string; v: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] tracking-[0.15em] uppercase text-cs-muted">{l}</div>
      <div className="text-[12px] text-cs-black break-words">{v}</div>
    </div>
  );
}
