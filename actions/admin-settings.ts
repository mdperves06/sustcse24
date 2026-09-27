"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { formToObject } from "@/lib/forms";
import { updateSystemSettings } from "@/services/system-settings";

export async function updateSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const changed = await updateSystemSettings(actor, formToObject(formData));
    revalidatePath("/", "layout");
    return { changed };
  }, "Settings saved.");
}
