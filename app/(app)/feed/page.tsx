import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { feedFiltersSchema } from "@/lib/validation/posts";
import { getPostingRestriction, listPosts } from "@/services/posts";
import { PageHeader } from "@/components/shared/page-header";
import { FeedFilters } from "@/components/feed/feed-filters";
import { PostComposer } from "@/components/feed/post-composer";
import { PostList } from "@/components/feed/post-list";
import { RestrictionNotice } from "@/components/feed/restriction-notice";

export const metadata: Metadata = { title: "Community Feed" };

export default async function FeedPage({ searchParams }: PageProps<"/feed">) {
  const viewer = await requireUser();
  const sp = await searchParams;
  const filters = feedFiltersSchema.parse(sp);
  const [result, restriction] = await Promise.all([listPosts(viewer, filters), getPostingRestriction(viewer.id)]);
  const staff = can(viewer.role, "content.moderate");

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Community Feed"
        description="A private space for CSE 24: updates, questions, wins and opportunities. Only signed-in batch members can see it."
      />
      <div className="space-y-4">
        {restriction ? (
          <RestrictionNotice restriction={restriction} />
        ) : (
          <PostComposer viewer={{ fullName: viewer.fullName, avatarKey: viewer.avatarKey }} allowAnnouncement={staff} />
        )}
        <FeedFilters filters={filters} basePath="/feed" />
        {result.total > 0 && (filters.q || filters.type) ? (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {result.total} post{result.total === 1 ? "" : "s"} found
          </p>
        ) : null}
        <PostList
          result={result}
          allowAnnouncement={staff}
          basePath="/feed"
          searchParams={sp}
          filtered={Boolean(filters.q || filters.type)}
        />
      </div>
    </div>
  );
}
