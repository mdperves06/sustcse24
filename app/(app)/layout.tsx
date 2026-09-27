import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/current-user";
import { unreadCount } from "@/services/notifications";

/** Every page in this group requires a valid session and a changed password. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const unread = await unreadCount(user.id);
  return (
    <AppShell
      user={{ roll: user.roll, fullName: user.fullName, avatarKey: user.avatarKey, role: user.role }}
      unread={unread}
    >
      {children}
    </AppShell>
  );
}
