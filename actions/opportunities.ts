"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { formToObject } from "@/lib/forms";
import * as opportunities from "@/services/opportunities";

function revalidate() {
  revalidatePath("/opportunities");
  revalidatePath("/dashboard");
}

export async function createOpportunityAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const created = await opportunities.createOpportunity(actor, formToObject(formData));
    revalidate();
    return { id: created.id };
  }, "Opportunity posted.");
}

export async function updateOpportunityAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await opportunities.updateOpportunity(actor, id, formToObject(formData));
    revalidate();
  }, "Opportunity updated.");
}

export async function deleteOpportunityAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await opportunities.deleteOpportunity(actor, id);
    revalidate();
  }, "Opportunity deleted.");
}

export async function setOpportunityBookmarkAction(id: string, saved: boolean): Promise<ActionResult<{ saved: boolean }>> {
  return runAction(async () => {
    const actor = await getActor();
    const result = await opportunities.setOpportunityBookmark(actor, id, saved);
    revalidatePath("/opportunities");
    return result;
  }, saved ? "Saved to your list." : "Removed from saved.");
}
