"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { idSchema } from "@/lib/validation/common";
import { deleteReadNotifications, markAllNotificationsRead, markNotificationRead } from "@/services/notifications";

/** Only same-site relative paths — never an open redirect. */
function safeInternalPath(link: string | null | undefined): string | null {
  if (!link || !link.startsWith("/") || link.startsWith("//") || link.startsWith("/\\")) return null;
  return link;
}

/**
 * Form action for a notification row: marks it read (scoped to the viewer), then
 * navigates to its link. Only internal paths are followed, so a tampered form can
 * at most send the user to another page of this app.
 */
export async function openNotificationAction(formData: FormData): Promise<void> {
  const actor = await getActor();
  const id = idSchema.safeParse(formData.get("id"));
  if (id.success) await markNotificationRead(actor, id.data);
  revalidatePath("/", "layout");
  const link = formData.get("link");
  const target = safeInternalPath(typeof link === "string" ? link : null);
  if (target) redirect(target);
}

export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await markNotificationRead(actor, idSchema.parse(id));
    revalidatePath("/", "layout");
  });
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await markAllNotificationsRead(actor);
    revalidatePath("/", "layout");
  }, "All notifications marked as read.");
}

export async function clearReadNotificationsAction(): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await deleteReadNotifications(actor);
    revalidatePath("/", "layout");
  }, "Read notifications cleared.");
}
