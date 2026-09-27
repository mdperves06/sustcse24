"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { ValidationError } from "@/lib/errors";
import { formToObject } from "@/lib/forms";
import * as groups from "@/services/groups";

function revalidateGroups(slug?: string) {
  revalidatePath("/groups");
  if (slug) revalidatePath(`/groups/${slug}`);
}

export async function joinGroupAction(groupId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const g = await groups.joinGroup(actor, groupId);
    revalidateGroups(g.slug);
  }, "Joined the group.");
}

export async function leaveGroupAction(groupId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const g = await groups.leaveGroup(actor, groupId);
    revalidateGroups(g.slug);
  }, "You left the group.");
}

export async function createGroupAction(_prev: ActionResult, formData: FormData): Promise<ActionResult<{ slug: string }>> {
  return runAction(async () => {
    const actor = await getActor();
    const g = await groups.createGroup(actor, formToObject(formData));
    revalidateGroups(g.slug);
    return { slug: g.slug };
  }, "Group created.");
}

export async function updateGroupAction(_prev: ActionResult, formData: FormData): Promise<ActionResult<{ slug: string }>> {
  return runAction(async () => {
    const actor = await getActor();
    const id = formData.get("groupId");
    if (typeof id !== "string" || !id) throw new ValidationError("Missing group.");
    const g = await groups.updateGroup(actor, id, formToObject(formData));
    revalidateGroups(g.slug);
    return { slug: g.slug };
  }, "Group updated.");
}

export async function deleteGroupAction(groupId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await groups.deleteGroup(actor, groupId);
    // No revalidation of the (now missing) group page: the client navigates to /groups, which is rendered fresh.
  }, "Group deleted.");
}

export async function setMemberRoleAction(groupId: string, userId: string, role: "MEMBER" | "MANAGER"): Promise<ActionResult> {
  return runAction(
    async () => {
      const actor = await getActor();
      const g = await groups.setMemberRole(actor, groupId, userId, { role });
      revalidateGroups(g.slug);
    },
    role === "MANAGER" ? "Member promoted to manager." : "Manager changed to member.",
  );
}

export async function removeMemberAction(groupId: string, userId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const g = await groups.removeMember(actor, groupId, userId);
    revalidateGroups(g.slug);
  }, "Member removed from the group.");
}
