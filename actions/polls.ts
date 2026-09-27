"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { ValidationError } from "@/lib/errors";
import { formToObject } from "@/lib/forms";
import * as polls from "@/services/polls";

export async function createPollAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await polls.createPoll(actor, formToObject(formData));
    revalidatePath("/polls");
  }, "Poll published. The batch has been notified.");
}

export async function voteAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const pollId = formData.get("pollId");
    if (typeof pollId !== "string" || !pollId) throw new ValidationError("Missing poll.");
    await polls.vote(actor, pollId, { optionIds: formData.getAll("optionIds").filter((v): v is string => typeof v === "string") });
    revalidatePath("/polls");
  }, "Vote recorded. Thanks!");
}

export async function closePollAction(pollId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await polls.closePoll(actor, pollId);
    revalidatePath("/polls");
  }, "Poll closed.");
}

export async function deletePollAction(pollId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await polls.deletePoll(actor, pollId);
    revalidatePath("/polls");
  }, "Poll deleted.");
}
