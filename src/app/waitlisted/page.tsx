import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { GateScreen } from "@/components/GateScreen";

export const dynamic = "force-dynamic";

export default async function WaitlistedPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.status === "approved") redirect("/app/profile");
  if (profile.status === "pending") redirect("/pending");
  if (profile.status === "rejected") redirect("/rejected");

  return (
    <GateScreen
      mark="◯"
      title={
        <>
          On the
          <br />
          waitlist.
        </>
      }
      body="Thank you for applying. We've placed your application on the waitlist while we balance the membership. We'll be in touch when a spot opens."
    />
  );
}
