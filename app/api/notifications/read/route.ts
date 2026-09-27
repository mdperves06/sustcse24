import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiRoute, readJson } from "@/lib/api";
import { idSchema } from "@/lib/validation/common";
import { markAllNotificationsRead, markNotificationRead, unreadCount } from "@/services/notifications";

const bodySchema = z.union([z.object({ id: idSchema }), z.object({ all: z.literal(true) })]);

/** POST /api/notifications/read { id } | { all: true } */
export const POST = apiRoute(async ({ req, actor }) => {
  const body = bodySchema.parse(await readJson(req));
  if ("all" in body) await markAllNotificationsRead(actor);
  else await markNotificationRead(actor, body.id);
  revalidatePath("/", "layout");
  return { unread: await unreadCount(actor.id) };
});
