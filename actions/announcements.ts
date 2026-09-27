"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { formToObject, getFile } from "@/lib/forms";
import { idSchema } from "@/lib/validation/common";
import * as announcements from "@/services/announcements";

function revalidateAnnouncements(id?: string) {
  revalidatePath("/announcements");
  if (id) revalidatePath(`/announcements/${id}`);
  revalidatePath("/dashboard");
}

export async function createAnnouncementAction(_prev: ActionResult<{ id: string }>, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await getActor();
    const row = await announcements.createAnnouncement(actor, formToObject(formData), getFile(formData, "attachment"));
    revalidateAnnouncements(row.id);
    revalidatePath("/", "layout");
    return { id: row.id };
  }, "Announcement published.");
}

export async function updateAnnouncementAction(_prev: ActionResult<{ id: string }>, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await getActor();
    const id = idSchema.parse(formData.get("id"));
    await announcements.updateAnnouncement(actor, id, formToObject(formData), getFile(formData, "attachment"));
    revalidateAnnouncements(id);
    return { id };
  }, "Announcement updated.");
}

export async function setAnnouncementPinnedAction(id: string, pinned: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await announcements.setAnnouncementPinned(actor, idSchema.parse(id), pinned === true);
    revalidateAnnouncements(id);
  }, pinned ? "Announcement pinned." : "Announcement unpinned.");
}

export async function setAnnouncementArchivedAction(id: string, archived: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await announcements.setAnnouncementArchived(actor, idSchema.parse(id), archived === true);
    revalidateAnnouncements(id);
  }, archived ? "Announcement archived." : "Announcement restored.");
}

export async function deleteAnnouncementAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await announcements.deleteAnnouncement(actor, idSchema.parse(id));
    revalidateAnnouncements(id);
  }, "Announcement deleted.");
}
