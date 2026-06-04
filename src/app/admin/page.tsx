import { redirect } from "next/navigation";

// Admin landing → analytics dashboard. Applications is one click away.
export default function AdminHome() {
  redirect("/admin/analytics");
}
