"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { formToObject, getFile } from "@/lib/forms";
import { ValidationError } from "@/lib/errors";
import * as profiles from "@/services/profiles";

function revalidateProfile(roll: string) {
  revalidatePath(`/students/${roll}`);
  revalidatePath("/profile/edit");
  revalidatePath("/directory");
  revalidatePath("/", "layout");
}

export async function updateProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await profiles.updateOwnProfile(actor, formToObject(formData));
    revalidateProfile(actor.roll);
  }, "Profile saved.");
}

export async function updatePrivacyAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await profiles.updateOwnPrivacy(actor, formToObject(formData));
    revalidateProfile(actor.roll);
  }, "Privacy settings saved.");
}

export async function uploadAvatarAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const file = getFile(formData, "avatar");
    if (!file) throw new ValidationError("Choose an image to upload.", { avatar: ["Choose an image to upload."] });
    await profiles.setOwnAvatar(actor, file);
    revalidateProfile(actor.roll);
  }, "Profile photo updated.");
}

export async function removeAvatarAction(): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await profiles.removeOwnAvatar(actor);
    revalidateProfile(actor.roll);
  }, "Profile photo removed.");
}

export async function uploadCvAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const file = getFile(formData, "cv");
    if (!file) throw new ValidationError("Choose a PDF to upload.", { cv: ["Choose a PDF to upload."] });
    await profiles.setOwnCv(actor, file);
    revalidateProfile(actor.roll);
  }, "CV uploaded.");
}

export async function removeCvAction(): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await profiles.removeOwnCv(actor);
    revalidateProfile(actor.roll);
  }, "CV removed.");
}
