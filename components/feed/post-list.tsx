import { MessagesSquare } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { PostCard } from "@/components/feed/post-card";
import type { PostView } from "@/services/posts";

export function PostList({
  result,
  allowAnnouncement,
  basePath,
  searchParams,
  emptyTitle = "No posts yet",
  emptyDescription = "Start the conversation: share an update or ask a question.",
  filtered = false,
}: {
  result: { posts: PostView[]; page: number; pageCount: number };
  allowAnnouncement: boolean;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
  emptyTitle?: string;
  emptyDescription?: string;
  filtered?: boolean;
}) {
  if (result.posts.length === 0) {
    return (
      <EmptyState
        icon={MessagesSquare}
        title={filtered ? "No posts match your filters" : emptyTitle}
        description={filtered ? "Try a different search or post type." : emptyDescription}
      />
    );
  }
  return (
    <>
      <ul className="space-y-4">
        {result.posts.map((post) => (
          <li key={post.id}>
            <PostCard post={post} allowAnnouncement={allowAnnouncement} />
          </li>
        ))}
      </ul>
      <Pagination page={result.page} pageCount={result.pageCount} basePath={basePath} searchParams={searchParams} />
    </>
  );
}
