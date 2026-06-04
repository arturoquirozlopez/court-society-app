import { redirect } from "next/navigation";

/** /app → /app/dashboard. The dashboard is the member home. */
export default function AppIndex() {
  redirect("/app/dashboard");
}
