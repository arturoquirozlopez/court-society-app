import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { GateScreen } from "@/components/GateScreen";

export const dynamic = "force-dynamic";

export default async function RejectedPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.status === "approved") redirect("/app/profile");
  if (profile.status === "pending") redirect("/pending");
  if (profile.status === "waitlisted") redirect("/waitlisted");

  return (
    <GateScreen
      mark="—"
      title={
        <>
          Thank
          <br />
          you.
        </>
      }
      body="We appreciate your interest. At this time, we are not able to extend an invitation. The composition of the Society evolves; you are welcome to apply again in the future."
    />
  );
}
