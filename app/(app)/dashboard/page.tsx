import { requireUser } from "@/lib/auth/current-user";

export default async function DashboardPage() {
  const user = await requireUser();
  return <h1 className="text-2xl font-semibold">Welcome back, {user.fullName.split(" ")[0]} 👋</h1>;
}
