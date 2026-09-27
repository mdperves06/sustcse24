import type { Metadata } from "next";
import Link from "next/link";
import { BellOff } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { listNotifications, unreadCount } from "@/services/notifications";
import { ensureReminders } from "@/services/reminders";
import { formatRelative } from "@/lib/time";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { NotificationItem, type NotificationRow } from "@/components/notifications/notification-item";
import { NotificationToolbar } from "@/components/notifications/notification-toolbar";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  const viewer = await requireUser();
  await ensureReminders(viewer);
  const { filter } = await searchParams;
  const unreadOnly = filter === "unread";

  const [all, unread] = await Promise.all([listNotifications(viewer, { take: 100 }), unreadCount(viewer.id)]);
  const rows = unreadOnly ? all.filter((n) => n.readAt === null) : all;
  const readCount = all.filter((n) => n.readAt !== null).length;
  const now = new Date();
  const items: NotificationRow[] = rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    unread: n.readAt === null,
    timeLabel: formatRelative(n.createdAt, now),
    timeIso: n.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Notifications"
        description={unread ? `You have ${unread} unread notification${unread === 1 ? "" : "s"}.` : "You're all caught up."}
        actions={<NotificationToolbar unread={unread} read={readCount} />}
      />

      <nav aria-label="Filter notifications" className="mb-4 inline-flex rounded-lg bg-muted p-[3px]">
        {(
          [
            ["all", "All", "/notifications"],
            ["unread", `Unread${unread ? ` (${unread})` : ""}`, "/notifications?filter=unread"],
          ] as const
        ).map(([key, label, href]) => {
          const active = (key === "unread") === unreadOnly;
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                active && "bg-background text-foreground shadow-sm dark:bg-input/30",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {items.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title={unreadOnly ? "No unread notifications" : "No notifications yet"}
          description="Announcements, event reminders, birthday wishes and replies will show up here."
        />
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-xs">
          {items.map((n) => (
            <li key={n.id}>
              <NotificationItem notification={n} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
