"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { formToObject, getFiles } from "@/lib/forms";
import * as projects from "@/services/projects";

function projectInput(formData: FormData) {
  const input = formToObject(formData);
  delete input.screenshots;
  delete input.removeImageIds;
  return input;
}

function revalidate(id?: string) {
  revalidatePath("/projects");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/projects/${id}`);
}

export async function createProjectAction(_prev: ActionResult, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await getActor();
    const created = await projects.createProject(actor, projectInput(formData), getFiles(formData, "screenshots"));
    revalidate(created.id);
    return { id: created.id };
  }, "Project published to the gallery.");
}

export async function updateProjectAction(
  id: string,
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await getActor();
    const removeImageIds = formData.getAll("removeImageIds").filter((v): v is string => typeof v === "string");
    await projects.updateProject(actor, id, projectInput(formData), {
      screenshots: getFiles(formData, "screenshots"),
      removeImageIds,
    });
    revalidate(id);
    return { id };
  }, "Project updated.");
}

export async function deleteProjectAction(id: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    await projects.deleteProject(actor, id);
    revalidate(id);
  }, "Project deleted.");
}

export async function setProjectLikeAction(
  id: string,
  liked: boolean,
): Promise<ActionResult<{ liked: boolean; likeCount: number }>> {
  return runAction(async () => {
    const actor = await getActor();
    const result = await projects.setProjectLike(actor, id, liked);
    revalidate(id);
    return result;
  });
}

export async function setProjectBookmarkAction(id: string, bookmarked: boolean): Promise<ActionResult<{ bookmarked: boolean }>> {
  return runAction(async () => {
    const actor = await getActor();
    const result = await projects.setProjectBookmark(actor, id, bookmarked);
    revalidatePath("/projects");
    revalidatePath(`/projects/${id}`);
    return result;
  }, bookmarked ? "Project bookmarked." : "Bookmark removed.");
}
