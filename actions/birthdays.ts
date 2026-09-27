"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { formToObject } from "@/lib/forms";
import * as birthdays from "@/services/birthdays";

export async function sendBirthdayWishAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await birthdays.sendBirthdayWish(actor, formToObject(formData));
    revalidatePath("/birthdays");
  }, "Wish sent! 🎉");
}
