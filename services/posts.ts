import "server-only";
import { db } from "@/lib/db";
import { audit } from "@/lib/audit";
import { assertCan, can } from "@/lib/auth/permissions";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { Prisma } from "@/lib/generated/prisma/client";
import type { PostType, ReactionType } from "@/lib/generated/prisma/enums";
import { REACTION_META } from "@/lib/labels";
import type { Viewer } from "@/lib/privacy";
import { enforceRateLimit } from "@/lib/rate-limit";
import { authorSelect, toAuthor, type Author } from "@/lib/selects";
import { formatDateTime } from "@/lib/time";
import { deleteUpload, saveUpload } from "@/lib/uploads";
import {
  commentSchema,
  moderationSchema,
  POST_MAX_IMAGES,
  postSchema,
  REACTION_TYPES,
  reactionSchema,
  reportSchema,
  type FeedFilters,
} from "@/lib/validation/posts";
import { isMember } from "@/services/groups";
import { notifyUsers } from "@/services/notifications";

export const FEED_PAGE_SIZE = 15;

export type ReactionSummary = {
  counts: Record<ReactionType, number>;
  total: number;
  mine: ReactionType | null;
};

export type PostView = {
  id: string;
  type: PostType;
  content: string;
  linkUrl: string | null;
  imageKeys: string[];
  createdAt: Date;
  editedAt: Date | null;
  group: { id: string; slug: string; name: string; icon: string | null } | null;
  author: Author;
  reactions: ReactionSummary;
  commentCount: number;
  /** Only ever true for staff viewers — everyone else never receives removed posts. */
  removed: boolean;
  removedReason: string | null;
  isAuthor: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canModerate: boolean;
  canReport: boolean;
};

export type CommentView = {
  id: string;
  content: string;
  createdAt: Date;
  author: Author;
  removed: boolean;
  isAuthor: boolean;
  canDelete: boolean;
  canModerate: boolean;
  canReport: boolean;
};

const isModerator = (viewer: Viewer) => can(viewer.role, "content.moderate");

const visibleComments = { deletedAt: null, removedAt: null } satisfies Prisma.CommentWhereInput;

const postSelect = {
  id: true,
  type: true,
  content: true,
  linkUrl: true,
  imageKeys: true,
  createdAt: true,
  editedAt: true,
  removedAt: true,
  removedReason: true,
  authorId: true,
  author: { select: authorSelect },
  group: { select: { id: true, slug: true, name: true, icon: true, deletedAt: true } },
  _count: { select: { comments: { where: visibleComments } } },
} satisfies Prisma.PostSelect;

type PostRow = Prisma.PostGetPayload<{ select: typeof postSelect }>;

function emptyCounts(): Record<ReactionType, number> {
  return Object.fromEntries(REACTION_TYPES.map((t) => [t, 0])) as Record<ReactionType, number>;
}

/** Aggregated reaction counts + the viewer's own reaction for a set of posts (2 queries total). */
async function reactionSummaries(viewer: Viewer, postIds: string[]): Promise<Map<string, ReactionSummary>> {
  const out = new Map<string, ReactionSummary>();
  for (const id of postIds) out.set(id, { counts: emptyCounts(), total: 0, mine: null });
  if (postIds.length === 0) return out;
  const [grouped, mine] = await Promise.all([
    db.reaction.groupBy({ by: ["postId", "type"], where: { postId: { in: postIds } }, _count: { _all: true } }),
    db.reaction.findMany({ where: { postId: { in: postIds }, userId: viewer.id }, select: { postId: true, type: true } }),
  ]);
  for (const g of grouped) {
    const s = out.get(g.postId)!;
    s.counts[g.type] = g._count._all;
    s.total += g._count._all;
  }
  for (const m of mine) out.get(m.postId)!.mine = m.type;
  return out;
}

function toPostView(row: PostRow, viewer: Viewer, reactions: ReactionSummary): PostView {
  const mod = isModerator(viewer);
  const isAuthor = row.authorId === viewer.id;
  const removed = Boolean(row.removedAt);
  return {
    id: row.id,
    type: row.type,
    content: row.content,
    linkUrl: row.linkUrl,
    imageKeys: row.imageKeys,
    createdAt: row.createdAt,
    editedAt: row.editedAt,
    group: row.group ? { id: row.group.id, slug: row.group.slug, name: row.group.name, icon: row.group.icon } : null,
    author: toAuthor(row.author),
    reactions,
    commentCount: row._count.comments,
    removed,
    removedReason: mod ? row.removedReason : null,
    isAuthor,
    canEdit: isAuthor && !removed,
    canDelete: isAuthor || mod,
    canModerate: mod,
    canReport: !isAuthor && !removed,
  };
}

/** Base filter for posts a viewer may see. Staff also see moderator-removed posts (to restore them). */
function visiblePostWhere(viewer: Viewer): Prisma.PostWhereInput {
  return {
    deletedAt: null,
    ...(isModerator(viewer) ? {} : { removedAt: null }),
    author: { deletedAt: null },
    OR: [{ groupId: null }, { group: { deletedAt: null } }],
  };
}

// ───────────────────────────── Restrictions ─────────────────────────────

export async function getPostingRestriction(userId: string): Promise<{ until: Date; reason: string | null } | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { postingRestrictedUntil: true, restrictionReason: true },
  });
  if (!user?.postingRestrictedUntil || user.postingRestrictedUntil.getTime() <= Date.now()) return null;
  return { until: user.postingRestrictedUntil, reason: user.restrictionReason };
}

export function restrictionMessage(r: { until: Date; reason: string | null }) {
  return `Your posting privileges are restricted until ${formatDateTime(r.until)}${r.reason ? ` (${r.reason})` : ""}.`;
}

async function assertCanWrite(actor: Viewer) {
  const r = await getPostingRestriction(actor.id);
  if (r) throw new ForbiddenError(restrictionMessage(r));
}

async function actorName(userId: string) {
  const p = await db.studentProfile.findUnique({ where: { userId }, select: { fullName: true } });
  return p?.fullName ?? "Someone";
}

// ───────────────────────────── Reading ─────────────────────────────

/**
 * Paginated feed. `groupId: null` (default) is the main batch feed; group posts only
 * appear inside their group.
 */
export async function listPosts(viewer: Viewer, filters: FeedFilters, opts: { groupId?: string | null } = {}) {
  const where: Prisma.PostWhereInput = {
    AND: [
      visiblePostWhere(viewer),
      { groupId: opts.groupId ?? null },
      filters.type ? { type: filters.type } : {},
      filters.q ? { content: { contains: filters.q, mode: "insensitive" } } : {},
    ],
  };
  const [total, rows] = await Promise.all([
    db.post.count({ where }),
    db.post.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (filters.page - 1) * FEED_PAGE_SIZE,
      take: FEED_PAGE_SIZE,
      select: postSelect,
    }),
  ]);
  const summaries = await reactionSummaries(viewer, rows.map((r) => r.id));
  return {
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / FEED_PAGE_SIZE)),
    posts: rows.map((r) => toPostView(r, viewer, summaries.get(r.id)!)),
  };
}

export async function getPost(viewer: Viewer, postId: string): Promise<PostView> {
  const row = await db.post.findFirst({ where: { AND: [{ id: postId }, visiblePostWhere(viewer)] }, select: postSelect });
  if (!row) throw new NotFoundError("This post doesn't exist or was deleted.");
  const summaries = await reactionSummaries(viewer, [row.id]);
  return toPostView(row, viewer, summaries.get(row.id)!);
}

/** Loads a post the actor may interact with (not deleted, not removed, group not deleted). */
async function findInteractivePost(postId: string) {
  const post = await db.post.findFirst({
    where: { id: postId, deletedAt: null, removedAt: null, OR: [{ groupId: null }, { group: { deletedAt: null } }] },
    select: { id: true, authorId: true, groupId: true, content: true },
  });
  if (!post) throw new NotFoundError("This post doesn't exist or was removed.");
  return post;
}

// ───────────────────────────── Writing posts ─────────────────────────────

export async function createPost(actor: Viewer, input: unknown, images: File[] = [], opts: { groupId?: string | null } = {}) {
  await assertCanWrite(actor);
  const data = postSchema.parse(input);
  if (data.type === "ANNOUNCEMENT" && !isModerator(actor)) {
    throw new ForbiddenError("Only moderators and admins can post announcements.");
  }
  if (images.length > POST_MAX_IMAGES) {
    throw new ValidationError(`You can attach up to ${POST_MAX_IMAGES} images.`, {
      images: [`Attach at most ${POST_MAX_IMAGES} images.`],
    });
  }

  let group: { id: string; slug: string } | null = null;
  if (opts.groupId) {
    group = await db.group.findFirst({ where: { id: opts.groupId, deletedAt: null }, select: { id: true, slug: true } });
    if (!group) throw new NotFoundError("This group doesn't exist.");
    if (!(await isMember(group.id, actor.id))) throw new ForbiddenError("Join this group to post in it.");
  }

  await enforceRateLimit(`post:create:${actor.id}`, 20, 3600, "You're posting a lot — please wait a while before posting again.");

  const keys: string[] = [];
  try {
    for (const file of images) keys.push((await saveUpload(file, "postImage", "images")).key);
    const post = await db.post.create({
      data: {
        authorId: actor.id,
        groupId: group?.id ?? null,
        type: data.type,
        content: data.content,
        linkUrl: data.linkUrl,
        imageKeys: keys,
      },
      select: { id: true },
    });
    return { id: post.id, groupSlug: group?.slug ?? null };
  } catch (error) {
    await Promise.all(keys.map((k) => deleteUpload(k)));
    throw error;
  }
}

export async function updatePost(actor: Viewer, postId: string, input: unknown) {
  const post = await db.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true, removedAt: true, group: { select: { slug: true } } },
  });
  if (!post) throw new NotFoundError("This post doesn't exist or was deleted.");
  if (post.authorId !== actor.id) throw new ForbiddenError("You can only edit your own posts.");
  if (post.removedAt) throw new ForbiddenError("This post was removed by a moderator and can't be edited.");
  const data = postSchema.parse(input);
  if (data.type === "ANNOUNCEMENT" && !isModerator(actor)) {
    throw new ForbiddenError("Only moderators and admins can post announcements.");
  }
  await db.post.update({
    where: { id: post.id },
    data: { type: data.type, content: data.content, linkUrl: data.linkUrl, editedAt: new Date() },
  });
  return { id: post.id, groupSlug: post.group?.slug ?? null };
}

/** Soft delete. Authors may delete their own posts; staff may delete any post (audited). */
export async function deletePost(actor: Viewer, postId: string) {
  const post = await db.post.findFirst({
    where: { id: postId, deletedAt: null },
    select: { id: true, authorId: true, group: { select: { slug: true } } },
  });
  if (!post) throw new NotFoundError("This post doesn't exist or was already deleted.");
  const own = post.authorId === actor.id;
  if (!own) assertCan(actor, "content.moderate");
  await db.post.update({ where: { id: post.id }, data: { deletedAt: new Date() } });
  if (!own) {
    await audit({ actorId: actor.id, action: "post.delete", entityType: "Post", entityId: post.id, metadata: { authorId: post.authorId } });
  }
  return { groupSlug: post.group?.slug ?? null };
}

// ───────────────────────────── Reactions ─────────────────────────────

/** Same type again removes the reaction; a different type switches it. Returns the fresh summary. */
export async function toggleReaction(actor: Viewer, postId: string, input: unknown): Promise<ReactionSummary> {
  const { type } = reactionSchema.parse(input);
  const post = await findInteractivePost(postId);
  await enforceRateLimit(`post:react:${actor.id}`, 120, 60, "Slow down a little — too many reactions.");

  const key = { postId_userId: { postId: post.id, userId: actor.id } };
  const existing = await db.reaction.findUnique({ where: key, select: { type: true } });
  let added = false;
  if (existing?.type === type) {
    await db.reaction.deleteMany({ where: { postId: post.id, userId: actor.id } });
  } else {
    await db.reaction.upsert({
      where: key,
      create: { postId: post.id, userId: actor.id, type },
      update: { type },
    });
    added = true;
  }

  if (added && post.authorId !== actor.id) {
    const name = await actorName(actor.id);
    await notifyUsers([post.authorId], {
      type: "REACTION",
      title: `${name} reacted ${REACTION_META[type].emoji} to your post`,
      body: post.content.slice(0, 140),
      link: `/feed/${post.id}`,
      actorId: actor.id,
      dedupeKey: `reaction:${post.id}:${actor.id}`,
    });
  }

  const summaries = await reactionSummaries(actor, [post.id]);
  return summaries.get(post.id)!;
}

// ───────────────────────────── Comments ─────────────────────────────

const commentSelect = {
  id: true,
  content: true,
  createdAt: true,
  removedAt: true,
  authorId: true,
  author: { select: authorSelect },
} satisfies Prisma.CommentSelect;

type CommentRow = Prisma.CommentGetPayload<{ select: typeof commentSelect }>;

function toCommentView(row: CommentRow, viewer: Viewer): CommentView {
  const mod = isModerator(viewer);
  const isAuthor = row.authorId === viewer.id;
  const removed = Boolean(row.removedAt);
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt,
    author: toAuthor(row.author),
    removed,
    isAuthor,
    canDelete: isAuthor || mod,
    canModerate: mod,
    canReport: !isAuthor && !removed,
  };
}

export async function listComments(viewer: Viewer, postId: string): Promise<CommentView[]> {
  // Visibility of the parent post is enforced first (removed posts are staff-only).
  await getPostVisibility(viewer, postId);
  const rows = await db.comment.findMany({
    where: {
      postId,
      deletedAt: null,
      ...(isModerator(viewer) ? {} : { removedAt: null }),
      author: { deletedAt: null },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: 500,
    select: commentSelect,
  });
  return rows.map((r) => toCommentView(r, viewer));
}

async function getPostVisibility(viewer: Viewer, postId: string) {
  const post = await db.post.findFirst({ where: { AND: [{ id: postId }, visiblePostWhere(viewer)] }, select: { id: true } });
  if (!post) throw new NotFoundError("This post doesn't exist or was deleted.");
}

export async function addComment(actor: Viewer, postId: string, input: unknown) {
  await assertCanWrite(actor);
  const data = commentSchema.parse(input);
  const post = await findInteractivePost(postId);
  if (post.groupId && !(await isMember(post.groupId, actor.id))) {
    throw new ForbiddenError("Join this group to take part in the discussion.");
  }
  await enforceRateLimit(`comment:create:${actor.id}`, 60, 3600, "You're commenting a lot — please wait a while.");

  const comment = await db.comment.create({
    data: { postId: post.id, authorId: actor.id, content: data.content },
    select: commentSelect,
  });

  if (post.authorId !== actor.id) {
    const name = await actorName(actor.id);
    await notifyUsers([post.authorId], {
      type: "COMMENT",
      title: `${name} commented on your post`,
      body: data.content.slice(0, 140),
      link: `/feed/${post.id}`,
      actorId: actor.id,
    });
  }
  return toCommentView(comment, actor);
}

/** Soft delete. Authors may delete their own comments; staff may delete any (audited). */
export async function deleteComment(actor: Viewer, commentId: string) {
  const comment = await db.comment.findFirst({
    where: { id: commentId, deletedAt: null },
    select: { id: true, authorId: true, postId: true },
  });
  if (!comment) throw new NotFoundError("This comment doesn't exist or was already deleted.");
  const own = comment.authorId === actor.id;
  if (!own) assertCan(actor, "content.moderate");
  await db.comment.update({ where: { id: comment.id }, data: { deletedAt: new Date() } });
  if (!own) {
    await audit({
      actorId: actor.id,
      action: "comment.delete",
      entityType: "Comment",
      entityId: comment.id,
      metadata: { postId: comment.postId, authorId: comment.authorId },
    });
  }
  return { postId: comment.postId };
}

// ───────────────────────────── Reports ─────────────────────────────

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function reportPost(actor: Viewer, postId: string, input: unknown) {
  const data = reportSchema.parse(input);
  const post = await findInteractivePost(postId);
  if (post.authorId === actor.id) throw new ValidationError("You can't report your own post.");
  await enforceRateLimit(`report:${actor.id}`, 10, 3600, "You've sent a lot of reports — please wait a while.");
  try {
    await db.report.create({
      data: { reporterId: actor.id, targetType: "POST", postId: post.id, reason: data.reason, details: data.details },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictError("You've already reported this.");
    throw error;
  }
}

export async function reportComment(actor: Viewer, commentId: string, input: unknown) {
  const data = reportSchema.parse(input);
  const comment = await db.comment.findFirst({
    where: { id: commentId, deletedAt: null, removedAt: null, post: { deletedAt: null } },
    select: { id: true, authorId: true },
  });
  if (!comment) throw new NotFoundError("This comment doesn't exist or was removed.");
  if (comment.authorId === actor.id) throw new ValidationError("You can't report your own comment.");
  await enforceRateLimit(`report:${actor.id}`, 10, 3600, "You've sent a lot of reports — please wait a while.");
  try {
    await db.report.create({
      data: { reporterId: actor.id, targetType: "COMMENT", commentId: comment.id, reason: data.reason, details: data.details },
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ConflictError("You've already reported this.");
    throw error;
  }
}

// ───────────────────────────── Moderation (also used by the admin moderation queue) ─────────────────────────────

export async function setPostRemoved(actor: Viewer, postId: string, removed: boolean, reason?: string | null): Promise<void> {
  assertCan(actor, "content.moderate");
  const { reason: note } = moderationSchema.parse({ reason: reason ?? undefined });
  const post = await db.post.findFirst({ where: { id: postId, deletedAt: null }, select: { id: true, authorId: true } });
  if (!post) throw new NotFoundError("This post doesn't exist or was deleted.");
  await db.post.update({
    where: { id: post.id },
    data: removed
      ? { removedAt: new Date(), removedById: actor.id, removedReason: note }
      : { removedAt: null, removedById: null, removedReason: null },
  });
  await audit({
    actorId: actor.id,
    action: removed ? "post.remove" : "post.restore",
    entityType: "Post",
    entityId: post.id,
    metadata: { authorId: post.authorId, reason: note },
  });
}

export async function setCommentRemoved(actor: Viewer, commentId: string, removed: boolean, reason?: string | null): Promise<void> {
  assertCan(actor, "content.moderate");
  const { reason: note } = moderationSchema.parse({ reason: reason ?? undefined });
  const comment = await db.comment.findFirst({
    where: { id: commentId, deletedAt: null },
    select: { id: true, authorId: true, postId: true },
  });
  if (!comment) throw new NotFoundError("This comment doesn't exist or was deleted.");
  await db.comment.update({ where: { id: comment.id }, data: { removedAt: removed ? new Date() : null } });
  await audit({
    actorId: actor.id,
    action: removed ? "comment.remove" : "comment.restore",
    entityType: "Comment",
    entityId: comment.id,
    metadata: { postId: comment.postId, authorId: comment.authorId, reason: note },
  });
}

/** Resolves which post a comment belongs to (for revalidation after comment moderation). */
export async function getCommentPostId(commentId: string) {
  const c = await db.comment.findUnique({ where: { id: commentId }, select: { postId: true } });
  return c?.postId ?? null;
}
