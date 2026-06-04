/**
 * Hand-maintained domain types. Source of truth for shapes used in the UI.
 * The full DB row types live in `src/lib/db/types.ts` (regenerated via
 * `pnpm db:types`).
 */

export type MemberStatus =
  | "pending"
  | "approved"
  | "waitlisted"
  | "rejected";

export type MemberRole = "member" | "steward" | "admin";

export type PlayLevel =
  | "beginner"
  | "recreational"
  | "intermediate"
  | "strong_club"
  | "competitive"
  | "former_pro";

export type PlayFormat = "singles" | "doubles" | "both";

export type PlayFrequency =
  | "less_than_weekly"
  | "weekly"
  | "two_to_three"
  | "four_plus";

export type ChallengeStatus = "open" | "accepted" | "expired" | "cancelled";
export type MatchStatus = "pending" | "confirmed" | "disputed";
export type MatchResult = "W" | "L";

export const LEVEL_LABEL: Record<PlayLevel, string> = {
  beginner: "Beginner",
  recreational: "Recreational — 2.5–3.0",
  intermediate: "Intermediate — 3.0–3.5",
  strong_club: "Strong club — 4.0–4.5",
  competitive: "Competitive — 5.0+",
  former_pro: "Former pro",
};

export const LEVEL_SHORT: Record<PlayLevel, string> = {
  beginner: "Beg",
  recreational: "2.5–3.0",
  intermediate: "3.0–3.5",
  strong_club: "4.0–4.5",
  competitive: "5.0+",
  former_pro: "Pro",
};

export const FORMAT_LABEL: Record<PlayFormat, string> = {
  singles: "Singles",
  doubles: "Doubles",
  both: "Both",
};

export const FREQUENCY_LABEL: Record<PlayFrequency, string> = {
  less_than_weekly: "Less than weekly",
  weekly: "Once a week",
  two_to_three: "2–3 times a week",
  four_plus: "4+ times a week",
};

export interface City {
  id: string;
  slug: string;
  name: string;
  active: boolean;
}

export interface Club {
  id: string;
  city_id: string;
  slug: string;
  name: string;
  active: boolean;
  is_other: boolean;
}

export type Gender = "M" | "F";

export const GENDER_LABEL: Record<Gender, string> = {
  M: "Men",
  F: "Women",
};

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  photo_url: string | null;
  headline: string | null;
  linkedin_url: string | null;
  whatsapp: string | null;
  gender: Gender | null;
  role: MemberRole;
  status: MemberStatus;
  home_city_id: string | null;
  home_club_id: string | null;
  other_club_name: string | null;
  level: PlayLevel | null;
  format: PlayFormat | null;
  frequency: PlayFrequency | null;
  travel_city_ids: string[];
  nominated_by_text: string | null;
  joined_at: string | null;
  onboarding_completed: boolean;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Application {
  id: string;
  profile_id: string;
  status: MemberStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface Challenge {
  id: string;
  author_id: string;
  city_id: string;
  level: PlayLevel;
  format: PlayFormat;
  note: string | null;
  status: ChallengeStatus;
  accepted_by: string | null;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface Match {
  id: string;
  season_id: string;
  author_id: string;
  opponent_id: string;
  author_result: MatchResult;
  score: string | null;
  note: string | null;
  status: MatchStatus;
  confirmed_at: string | null;
  created_at: string;
}

export interface Season {
  id: string;
  year: number;
  started_at: string;
  ended_at: string | null;
  active: boolean;
}

export interface VisitingPlan {
  id: string;
  profile_id: string;
  city_id: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export type NominationStatus =
  | "pending"
  | "applied"
  | "approved"
  | "declined"
  | "expired"
  | "cancelled";

export interface Nomination {
  id: string;
  token: string;
  nominator_id: string;
  nominee_email: string;
  nominee_name: string;
  note: string | null;
  status: NominationStatus;
  expires_at: string;
  applied_profile_id: string | null;
  applied_at: string | null;
  created_at: string;
}

/** Shape returned by the `nomination_by_token` Postgres function. */
export interface NominationByToken {
  id: string;
  nominator_id: string;
  nominator_name: string | null;
  nominee_email: string;
  nominee_name: string;
  note: string | null;
  status: NominationStatus;
  expires_at: string;
}

export interface Group {
  id: string;
  name: string;
  creator_id: string;
  created_at: string;
}

export type GroupMemberStatus = "pending" | "accepted";

export interface GroupMember {
  group_id: string;
  profile_id: string;
  status: GroupMemberStatus;
  joined_at: string;
}

/** A group enriched with the caller's membership context. */
export interface GroupWithContext extends Group {
  member_ids: string[]; // accepted members only
  is_creator: boolean;
}

/** A pending invitation surfaced to the invitee. */
export interface GroupInvitation {
  group_id: string;
  group_name: string;
  inviter_id: string;
  inviter_name: string | null;
  invited_at: string;
}
