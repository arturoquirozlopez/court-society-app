/**
 * Placeholder Supabase types.
 *
 * Replace with auto-generated types after running:
 *   npx supabase link --project-ref <YOUR_REF>
 *   npm run db:types
 *
 * Hand-written domain types in `@/lib/types` remain the UI source of truth.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>;
    Views: Record<string, never>;
    Functions: Record<
      string,
      { Args: Record<string, unknown>; Returns: unknown }
    >;
    Enums: {
      member_status: "pending" | "approved" | "waitlisted" | "rejected";
      member_role: "member" | "steward" | "admin";
      play_level:
        | "beginner"
        | "recreational"
        | "intermediate"
        | "strong_club"
        | "competitive"
        | "former_pro";
      play_format: "singles" | "doubles" | "both";
      play_frequency:
        | "less_than_weekly"
        | "weekly"
        | "two_to_three"
        | "four_plus";
      challenge_status: "open" | "accepted" | "expired" | "cancelled";
      match_status: "pending" | "confirmed" | "disputed";
      match_result: "W" | "L";
    };
  };
};
