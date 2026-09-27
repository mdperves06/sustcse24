import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { NotFoundError } from "@/lib/errors";
import type { Viewer } from "@/lib/privacy";
import { getPost, getPostingRestriction, listComments } from "@/services/posts";
import { isMember } from "@/services/groups";
import { Button } from "@/components/ui/button";
import { CommentForm } from "@/components/feed/comment-form";
import { CommentList } from "@/components/feed/comment-list";
import { PostCard } from "@/components/feed/post-card";
import { RestrictionNotice } from "@/components/feed/restriction-notice";

export const metadata: Metadata = { title: "Post" };

async function load(viewer: Viewer, id: string) {
  try {
    const post = await getPost(viewer, id);
    const comments = await listComments(viewer, id);
    return { post, comments };
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}

export default async function PostPage({ params }: PageProps<"/feed/[id]">) {
  const viewer = await requireUser();
  const { id } = await params;
  const { post, comments } = await load(viewer, id);
  const [restriction, member] = await Promise.all([
    getPostingRestriction(viewer.id),
    post.group ? isMember(post.group.id, viewer.id) : Promise.resolve(true),
  ]);
  const back = post.group ? { href: `/groups/${post.group.slug}`, label: post.group.name } : { href: "/feed", label: "Feed" };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href={back.href}>
          <ArrowLeft aria-hidden /> Back to {back.label}
        </Link>
      </Button>

      <PostCard post={post} allowAnnouncement={can(viewer.role, "content.moderate")} detail showGroup />

      <section id="comments" aria-labelledby="comments-title" className="scroll-mt-20 rounded-2xl border bg-card p-4 shadow-xs sm:p-5">
        <h2 id="comments-title" className="mb-4 font-semibold">
          Comments <span className="text-muted-foreground tabular-nums">({comments.filter((c) => !c.removed).length})</span>
        </h2>
        <CommentList comments={comments} />
        <div className="mt-5 border-t pt-5">
          {post.removed ? (
            <p className="text-sm text-muted-foreground">Comments are closed while this post is removed.</p>
          ) : restriction ? (
            <RestrictionNotice restriction={restriction} />
          ) : !member && post.group ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="size-4" aria-hidden />
              <span>
                <Link href={`/groups/${post.group.slug}`} className="font-medium text-primary hover:underline">
                  Join {post.group.name}
                </Link>{" "}
                to take part in this discussion.
              </span>
            </p>
          ) : (
            <CommentForm postId={post.id} viewer={{ fullName: viewer.fullName, avatarKey: viewer.avatarKey }} />
          )}
        </div>
      </section>
    </div>
  );
}
