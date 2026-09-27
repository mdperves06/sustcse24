"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { formToObject } from "@/lib/forms";
import * as achievements from "@/services/achievements";

function revalidate() {
  revalidatePath("/achievements");
  revalidatePath("/achievements/review");
  revalidatePath("/dashboard");
}

export async function submitAchievementAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const created = await achievements.submitAchievement(actor, formToObject(formData));
    revalidate();
    return { id: created.id };
  }, "Submitted! A moderator will review it soon.");
}

export async function deleteAchievementAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await achievements.deleteOwnAchievement(actor, id);
    revalidate();
  }, "Submission deleted.");
}

export async function verifyAchievementAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await achievements.verifyAchievement(actor, id);
    revalidate();
  }, "Achievement verified.");
}

export async function rejectAchievementAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await achievements.rejectAchievement(actor, id, formToObject(formData));
    revalidate();
  }, "Submission rejected.");
}

export async function revokeAchievementAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await achievements.revokeAchievementReview(actor, id);
    revalidate();
  }, "Moved back to the review queue.");
}
