import { Info } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { requireUser } from "@/lib/auth/current-user";
import { getSetting } from "@/lib/settings";
import { unreadCount } from "@/services/notifications";

/** Every page in this group requires a valid session and a changed password. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  const [unread, siteNotice] = await Promise.all([unreadCount(user.id), getSetting("siteNotice")]);
  return (
    <AppShell
      user={{ roll: user.roll, fullName: user.fullName, avatarKey: user.avatarKey, role: user.role }}
      unread={unread}
    >
      {siteNotice ? (
        <p role="status" className="mb-6 flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>{siteNotice}</span>
        </p>
      ) : null}
      {children}
    </AppShell>
  );
}
