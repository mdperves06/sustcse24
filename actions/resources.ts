"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { formToObject, getFile } from "@/lib/forms";
import * as resources from "@/services/resources";

export async function createResourceAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const input = formToObject(formData);
    delete input.file;
    const created = await resources.createResource(actor, input, getFile(formData, "file"));
    revalidatePath("/resources");
    return { id: created.id };
  }, "Resource shared. Thanks for helping the batch!");
}

export async function deleteResourceAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await resources.deleteResource(actor, id);
    revalidatePath("/resources");
  }, "Resource deleted.");
}
