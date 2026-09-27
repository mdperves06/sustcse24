"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { formToObject, getFile } from "@/lib/forms";
import { idSchema } from "@/lib/validation/common";
import { RSVP_MESSAGES } from "@/components/events/event-labels";
import type { RsvpStatus } from "@/lib/generated/prisma/enums";
import * as events from "@/services/events";

function revalidateEvents(id?: string) {
  revalidatePath("/events");
  if (id) revalidatePath(`/events/${id}`);
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

export async function createEventAction(_prev: ActionResult<{ id: string }>, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await getActor();
    const row = await events.createEvent(actor, formToObject(formData), getFile(formData, "cover"));
    revalidateEvents(row.id);
    revalidatePath("/", "layout");
    return { id: row.id };
  }, "Event created.");
}

export async function updateEventAction(_prev: ActionResult<{ id: string }>, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await getActor();
    const id = idSchema.parse(formData.get("id"));
    await events.updateEvent(actor, id, formToObject(formData), getFile(formData, "cover"));
    revalidateEvents(id);
    return { id };
  }, "Event updated.");
}

export async function deleteEventAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await events.deleteEvent(actor, idSchema.parse(id));
    revalidateEvents(id);
  }, "Event deleted.");
}

export async function rsvpAction(eventId: string, status: RsvpStatus): Promise<ActionResult<{ status: RsvpStatus }>> {
  const result = await runAction(async () => {
    const actor = await getActor();
    const saved = await events.setRsvp(actor, idSchema.parse(eventId), { status });
    revalidateEvents(eventId);
    return { status: saved };
  });
  return result.ok && result.data ? { ...result, message: RSVP_MESSAGES[result.data.status] } : result;
}
