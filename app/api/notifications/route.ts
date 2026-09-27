import { apiRoute } from "@/lib/api";
import { listNotifications, unreadCount } from "@/services/notifications";
import { ensureReminders } from "@/services/reminders";

/** GET /api/notifications?unread=1 — newest first (max 100), plus the unread count. */
export const GET = apiRoute(async ({ req, actor }) => {
  await ensureReminders(actor);
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";
  const [items, unread] = await Promise.all([
    listNotifications(actor, { unreadOnly, take: 100 }),
    unreadCount(actor.id),
  ]);
  return { unread, items };
});
