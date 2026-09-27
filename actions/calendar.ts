"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { formToObject } from "@/lib/forms";
import { idSchema } from "@/lib/validation/common";
import * as calendar from "@/services/calendar";

export async function createCalendarEntryAction(
  _prev: ActionResult<{ id: string; dateKey: string }>,
  formData: FormData,
): Promise<ActionResult<{ id: string; dateKey: string }>> {
  return runAction(async () => {
    const actor = await getActor();
    const row = await calendar.createCalendarEntry(actor, formToObject(formData));
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
    return { id: row.id, dateKey: row.dateKey };
  }, "Added to the calendar.");
}

export async function deleteCalendarEntryAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    // Item ids on the client are prefixed with their source ("calendar:<id>").
    const raw = id.startsWith("calendar:") ? id.slice("calendar:".length) : id;
    await calendar.deleteCalendarEntry(actor, idSchema.parse(raw));
    revalidatePath("/calendar");
    revalidatePath("/dashboard");
  }, "Calendar entry removed.");
}
