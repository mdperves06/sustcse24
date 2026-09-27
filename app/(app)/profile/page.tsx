import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";

/** "My profile" → the signed-in student's own profile page. */
export default async function MyProfilePage() {
  const user = await requireUser();
  redirect(`/students/${encodeURIComponent(user.roll)}`);
}
