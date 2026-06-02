import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { GateScreen } from "@/components/GateScreen";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.status === "approved") redirect("/app/profile");
  if (profile.status === "waitlisted") redirect("/waitlisted");
  if (profile.status === "rejected") redirect("/rejected");

  return (
    <GateScreen
      mark="✓"
      title={
        <>
          Application
          <br />
          received.
        </>
      }
      body="Your application has been received. We carefully review every application to maintain the quality of the Society. You will hear from us within seven days."
    />
  );
}
