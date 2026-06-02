import { redirect } from "next/navigation";

// Admin landing → applications queue
export default function AdminHome() {
  redirect("/admin/applications");
}
