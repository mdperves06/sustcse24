"use server";

import { revalidatePath } from "next/cache";
import { runAction, type ActionResult } from "@/lib/action";
import { getActor } from "@/lib/auth/current-user";
import { ValidationError } from "@/lib/errors";
import { formToObject, getFiles } from "@/lib/forms";
import * as posts from "@/services/posts";

function field(formData: FormData, name: string): string {
  const v = formData.get(name);
  if (typeof v !== "string" || !v) throw new ValidationError("Something is missing from this request. Reload and try again.");
  return v;
}

function revalidateFeed(opts: { postId?: string; groupSlug?: string | null } = {}) {
  revalidatePath("/feed");
  if (opts.postId) revalidatePath(`/feed/${opts.postId}`);
  if (opts.groupSlug) revalidatePath(`/groups/${opts.groupSlug}`);
}

export async function createPostAction(_prev: ActionResult, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const actor = await getActor();
    const input = formToObject(formData);
    delete input.images;
    const groupId = typeof input.groupId === "string" && input.groupId ? input.groupId : null;
    const post = await posts.createPost(actor, input, getFiles(formData, "images"), { groupId });
    revalidateFeed({ groupSlug: post.groupSlug });
    return { id: post.id };
  }, "Posted.");
}

export async function updatePostAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const id = field(formData, "postId");
    const post = await posts.updatePost(actor, id, formToObject(formData));
    revalidateFeed({ postId: id, groupSlug: post.groupSlug });
  }, "Post updated.");
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const res = await posts.deletePost(actor, postId);
    revalidateFeed({ postId, groupSlug: res.groupSlug });
  }, "Post deleted.");
}

export async function toggleReactionAction(postId: string, type: string): Promise<ActionResult<posts.ReactionSummary>> {
  return runAction(async () => {
    const actor = await getActor();
    return posts.toggleReaction(actor, postId, { type });
  });
}

export async function addCommentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const postId = field(formData, "postId");
    await posts.addComment(actor, postId, formToObject(formData));
    revalidateFeed({ postId });
  }, "Comment added.");
}

export async function deleteCommentAction(commentId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const res = await posts.deleteComment(actor, commentId);
    revalidateFeed({ postId: res.postId });
  }, "Comment deleted.");
}

export async function reportContentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    const targetType = field(formData, "targetType");
    const targetId = field(formData, "targetId");
    const input = formToObject(formData);
    if (targetType === "POST") await posts.reportPost(actor, targetId, input);
    else if (targetType === "COMMENT") await posts.reportComment(actor, targetId, input);
    else throw new ValidationError("Unknown report target.");
  }, "Thanks — a moderator will review your report.");
}

export async function moderatePostAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(
    async () => {
      const actor = await getActor();
      const id = field(formData, "postId");
      const removed = formData.get("removed") === "true";
      const reason = formData.get("reason");
      await posts.setPostRemoved(actor, id, removed, typeof reason === "string" ? reason : null);
      revalidatePath("/feed");
      revalidatePath(`/feed/${id}`);
      revalidatePath("/groups", "layout");
    },
    formData.get("removed") === "true" ? "Post removed." : "Post restored.",
  );
}

export async function moderateCommentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(
    async () => {
      const actor = await getActor();
      const id = field(formData, "commentId");
      const removed = formData.get("removed") === "true";
      const reason = formData.get("reason");
      await posts.setCommentRemoved(actor, id, removed, typeof reason === "string" ? reason : null);
      const postId = await posts.getCommentPostId(id);
      revalidateFeed({ postId: postId ?? undefined });
    },
    formData.get("removed") === "true" ? "Comment removed." : "Comment restored.",
  );
}
