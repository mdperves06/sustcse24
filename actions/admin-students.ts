"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { formToObject } from "@/lib/forms";
import * as users from "@/services/admin-users";
import type { AccountStatus, Role } from "@/lib/generated/prisma/enums";

function revalidateStudent(id?: string) {
  revalidatePath("/admin/students");
  if (id) revalidatePath(`/admin/students/${id}`);
  revalidatePath("/admin");
}

export async function createStudentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await getActor();
    const user = await users.createStudent(actor, formToObject(formData));
    revalidateStudent();
    return { id: user.id };
  }, "Student added. Their initial password is their roll number and they must change it at first sign-in.");
}

export async function updateStudentAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await users.updateStudent(actor, id, formToObject(formData));
    revalidateStudent(id);
  }, "Student details saved.");
}

export async function setRoleAction(id: string, role: Role): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await users.setRole(actor, id, role);
    revalidateStudent(id);
  }, "Role updated.");
}

export async function setStatusAction(id: string, status: AccountStatus): Promise<ActionResult> {
  return runAction(
    async () => {
      const actor = await getActor();
      await users.setStatus(actor, id, status);
      revalidateStudent(id);
    },
    status === "DISABLED" ? "Account disabled and signed out everywhere." : "Account enabled.",
  );
}

export async function resetPasswordAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await users.resetPassword(actor, id);
    revalidateStudent(id);
  }, "The student's password was reset to their roll number and they must change it at next sign-in.");
}

export async function deleteStudentAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await users.deleteStudent(actor, id);
    revalidateStudent(id);
  }, "Account deleted. Their content is kept and the account can be restored.");
}

export async function restoreStudentAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await users.restoreStudent(actor, id);
    revalidateStudent(id);
  }, "Account restored.");
}

export async function unlockStudentAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await users.unlockStudent(actor, id);
    revalidateStudent(id);
  }, "Account unlocked.");
}

export async function setVerifiedAction(id: string, verified: boolean): Promise<ActionResult> {
  return runAction(
    async () => {
      const actor = await getActor();
      await users.setVerified(actor, id, verified);
      revalidateStudent(id);
      revalidatePath("/directory");
    },
    verified ? "Profile verified." : "Verification removed.",
  );
}

export async function restrictStudentAction(id: string, _prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const input = formToObject(formData);
    await users.setPostingRestriction(actor, id, { until: input.until ?? "", reason: input.reason });
    revalidateStudent(id);
    revalidatePath("/admin/moderation");
  }, "Posting restriction saved.");
}

export async function liftRestrictionAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await users.setPostingRestriction(actor, id, { until: null });
    revalidateStudent(id);
    revalidatePath("/admin/moderation");
  }, "Posting restriction lifted.");
}
