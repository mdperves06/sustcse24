import "server-only";
import { db } from "@/lib/db";
import { assertCan } from "@/lib/auth/permissions";
import { AppError, NotFoundError } from "@/lib/errors";
import { authorSelect, toAuthor, type Author } from "@/lib/selects";
import { reportDecisionSchema, reportFiltersSchema, restrictForDaysSchema } from "@/lib/validation/admin";
import { setCommentRemoved, setPostRemoved } from "@/services/posts";
import { setPostingRestriction } from "@/services/admin-users";
import { recordAudit } from "@/services/audit-log";
import type { Viewer } from "@/lib/privacy";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { ReportStatus, ReportTarget } from "@/lib/generated/prisma/enums";

export const REPORTS_PAGE_SIZE = 20;

const reportSelect = {
  id: true,
  targetType: true,
  reason: true,
  details: true,
  status: true,
  createdAt: true,
  reviewedAt: true,
  resolutionNote: true,
  reporter: { select: authorSelect },
  reviewedBy: { select: authorSelect },
  post: {
    select: {
      id: true,
      content: true,
      createdAt: true,
      removedAt: true,
      deletedAt: true,
      author: { select: { ...authorSelect, postingRestrictedUntil: true } },
    },
  },
  comment: {
    select: {
      id: true,
      postId: true,
      content: true,
      createdAt: true,
      removedAt: true,
      deletedAt: true,
      author: { select: { ...authorSelect, postingRestrictedUntil: true } },
    },
  },
} satisfies Prisma.ReportSelect;

type ReportRow = Prisma.ReportGetPayload<{ select: typeof reportSelect }>;

export type ReportedContent = {
  kind: ReportTarget;
  id: string;
  postId: string;
  content: string;
  createdAt: Date;
  removed: boolean;
  deleted: boolean;
  author: Author;
  authorRestrictedUntil: Date | null;
};

export type ReportView = {
  id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  resolutionNote: string | null;
  reporter: Author;
  reviewedBy: Author | null;
  target: ReportedContent | null;
};

function toTarget(r: ReportRow): ReportedContent | null {
  const now = Date.now();
  const restricted = (d: Date | null) => (d && d.getTime() > now ? d : null);
  if (r.targetType === "POST" && r.post) {
    return {
      kind: "POST",
      id: r.post.id,
      postId: r.post.id,
      content: r.post.content,
      createdAt: r.post.createdAt,
      removed: Boolean(r.post.removedAt),
      deleted: Boolean(r.post.deletedAt),
      author: toAuthor(r.post.author),
      authorRestrictedUntil: restricted(r.post.author.postingRestrictedUntil),
    };
  }
  if (r.targetType === "COMMENT" && r.comment) {
    return {
      kind: "COMMENT",
      id: r.comment.id,
      postId: r.comment.postId,
      content: r.comment.content,
      createdAt: r.comment.createdAt,
      removed: Boolean(r.comment.removedAt),
      deleted: Boolean(r.comment.deletedAt),
      author: toAuthor(r.comment.author),
      authorRestrictedUntil: restricted(r.comment.author.postingRestrictedUntil),
    };
  }
  return null;
}

function toView(r: ReportRow): ReportView {
  return {
    id: r.id,
    reason: r.reason,
    details: r.details,
    status: r.status,
    createdAt: r.createdAt,
    reviewedAt: r.reviewedAt,
    resolutionNote: r.resolutionNote,
    reporter: toAuthor(r.reporter),
    reviewedBy: r.reviewedBy ? toAuthor(r.reviewedBy) : null,
    target: toTarget(r),
  };
}

export async function listReports(actor: Viewer, input: unknown) {
  assertCan(actor, "reports.review");
  const filters = reportFiltersSchema.parse(input);
  const where: Prisma.ReportWhereInput = { status: filters.status };
  const [total, rows, grouped] = await Promise.all([
    db.report.count({ where }),
    db.report.findMany({
      where,
      orderBy: filters.status === "PENDING" ? { createdAt: "asc" } : { reviewedAt: "desc" },
      skip: (filters.page - 1) * REPORTS_PAGE_SIZE,
      take: REPORTS_PAGE_SIZE,
      select: reportSelect,
    }),
    db.report.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const counts: Record<ReportStatus, number> = { PENDING: 0, RESOLVED: 0, DISMISSED: 0 };
  for (const g of grouped) counts[g.status] = g._count._all;
  return {
    filters,
    total,
    counts,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / REPORTS_PAGE_SIZE)),
    reports: rows.map(toView),
  };
}

export async function getReport(actor: Viewer, id: string): Promise<ReportView> {
  assertCan(actor, "reports.review");
  const row = await db.report.findUnique({ where: { id }, select: reportSelect });
  if (!row) throw new NotFoundError("That report no longer exists.");
  return toView(row);
}

/**
 * Reviews a report. "remove" takes the content down (via the posts service) and resolves every
 * pending report about the same content; "resolve" closes it without action; "dismiss" rejects it.
 */
export async function reviewReport(actor: Viewer, id: string, input: unknown) {
  assertCan(actor, "reports.review");
  const { decision, note } = reportDecisionSchema.parse(input);
  const report = await db.report.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      targetType: true,
      postId: true,
      commentId: true,
      post: { select: { removedAt: true, deletedAt: true } },
      comment: { select: { removedAt: true, deletedAt: true, postId: true } },
    },
  });
  if (!report) throw new NotFoundError("That report no longer exists.");
  if (report.status !== "PENDING") throw new AppError("This report has already been reviewed.", 409);

  const reviewed = { reviewedById: actor.id, reviewedAt: new Date(), resolutionNote: note };

  if (decision === "remove") {
    assertCan(actor, "content.moderate");
    const target = report.targetType === "POST" ? report.post : report.comment;
    if (target && !target.removedAt && !target.deletedAt) {
      if (report.targetType === "POST" && report.postId) await setPostRemoved(actor, report.postId, true, note);
      if (report.targetType === "COMMENT" && report.commentId) await setCommentRemoved(actor, report.commentId, true, note);
    }
    const sameTarget: Prisma.ReportWhereInput =
      report.targetType === "POST" ? { postId: report.postId } : { commentId: report.commentId };
    const resolved = await db.report.updateMany({
      where: { status: "PENDING", targetType: report.targetType, ...sameTarget },
      data: { status: "RESOLVED", ...reviewed },
    });
    await recordAudit(actor, "reports.resolve_remove", "Report", report.id, {
      targetType: report.targetType,
      targetId: report.postId ?? report.commentId,
      reportsResolved: resolved.count,
      note,
    });
  } else {
    const status: ReportStatus = decision === "dismiss" ? "DISMISSED" : "RESOLVED";
    await db.report.update({ where: { id }, data: { status, ...reviewed } });
    await recordAudit(actor, decision === "dismiss" ? "reports.dismiss" : "reports.resolve", "Report", report.id, {
      targetType: report.targetType,
      targetId: report.postId ?? report.commentId,
      note,
    });
  }

  return { postId: report.postId ?? report.comment?.postId ?? null };
}

/** Restricts the author of the reported content from posting for N days. */
export async function restrictReportedAuthor(actor: Viewer, reportId: string, input: unknown) {
  assertCan(actor, "users.restrict");
  const { days, reason } = restrictForDaysSchema.parse(input);
  const report = await db.report.findUnique({
    where: { id: reportId },
    select: { post: { select: { authorId: true } }, comment: { select: { authorId: true } } },
  });
  const authorId = report?.post?.authorId ?? report?.comment?.authorId;
  if (!authorId) throw new NotFoundError("The reported content no longer exists.");
  const until = new Date(Date.now() + days * 86_400_000);
  await setPostingRestriction(actor, authorId, { until: until.toISOString(), reason: reason ?? undefined });
}

/** Posts and comments with two or more pending reports. */
export async function listFlaggedContent(actor: Viewer) {
  assertCan(actor, "reports.review");
  const [posts, comments] = await Promise.all([
    db.report.groupBy({
      by: ["postId"],
      where: { status: "PENDING", targetType: "POST", postId: { not: null } },
      _count: { _all: true },
      having: { postId: { _count: { gte: 2 } } },
      orderBy: { _count: { postId: "desc" } },
      take: 20,
    }),
    db.report.groupBy({
      by: ["commentId"],
      where: { status: "PENDING", targetType: "COMMENT", commentId: { not: null } },
      _count: { _all: true },
      having: { commentId: { _count: { gte: 2 } } },
      orderBy: { _count: { commentId: "desc" } },
      take: 20,
    }),
  ]);

  const postIds = posts.map((p) => p.postId!).filter(Boolean);
  const commentIds = comments.map((c) => c.commentId!).filter(Boolean);
  const [postRows, commentRows] = await Promise.all([
    postIds.length
      ? db.post.findMany({ where: { id: { in: postIds } }, select: { id: true, content: true, author: { select: authorSelect } } })
      : Promise.resolve([]),
    commentIds.length
      ? db.comment.findMany({
          where: { id: { in: commentIds } },
          select: { id: true, postId: true, content: true, author: { select: authorSelect } },
        })
      : Promise.resolve([]),
  ]);
  const postMap = new Map(postRows.map((p) => [p.id, p]));
  const commentMap = new Map(commentRows.map((c) => [c.id, c]));

  const items: { kind: ReportTarget; id: string; postId: string; excerpt: string; author: Author; reports: number }[] = [];
  for (const g of posts) {
    const p = postMap.get(g.postId!);
    if (p) items.push({ kind: "POST", id: p.id, postId: p.id, excerpt: p.content.slice(0, 160), author: toAuthor(p.author), reports: g._count._all });
  }
  for (const g of comments) {
    const c = commentMap.get(g.commentId!);
    if (c) items.push({ kind: "COMMENT", id: c.id, postId: c.postId, excerpt: c.content.slice(0, 160), author: toAuthor(c.author), reports: g._count._all });
  }
  return items.sort((a, b) => b.reports - a.reports);
}

export function pendingReportCount() {
  return db.report.count({ where: { status: "PENDING" } });
}
