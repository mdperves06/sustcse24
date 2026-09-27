"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { formToObject } from "@/lib/forms";
import * as teammates from "@/services/teammates";

export async function createTeammateRequestAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const created = await teammates.createTeammateRequest(actor, formToObject(formData));
    revalidatePath("/teammates");
    return { id: created.id };
  }, "Request posted. Good luck finding your team!");
}

export async function setTeammateRequestStatusAction(id: string, open: boolean): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await teammates.setTeammateRequestStatus(actor, id, open ? "OPEN" : "CLOSED");
    revalidatePath("/teammates");
  }, open ? "Request reopened." : "Request closed.");
}

export async function deleteTeammateRequestAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await teammates.deleteTeammateRequest(actor, id);
    revalidatePath("/teammates");
  }, "Request deleted.");
}
