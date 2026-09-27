import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { NotFoundError } from "@/lib/errors";
import type { Viewer } from "@/lib/privacy";
import { formatDate } from "@/lib/time";
import { feedFiltersSchema } from "@/lib/validation/posts";
import { getGroupBySlug } from "@/services/groups";
import { getPostingRestriction, listPosts } from "@/services/posts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FeedFilters } from "@/components/feed/feed-filters";
import { PostComposer } from "@/components/feed/post-composer";
import { PostList } from "@/components/feed/post-list";
import { RestrictionNotice } from "@/components/feed/restriction-notice";
import { DeleteGroupButton } from "@/components/groups/delete-group-button";
import { GroupIcon } from "@/components/groups/group-card";
import { GroupFormDialog } from "@/components/groups/group-form-dialog";
import { MemberList } from "@/components/groups/member-list";
import { MembershipButton } from "@/components/groups/membership-button";

export const metadata: Metadata = { title: "Interest group" };

async function load(viewer: Viewer, slug: string) {
  try {
    return await getGroupBySlug(viewer, decodeURIComponent(slug));
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}

export default async function GroupPage({ params, searchParams }: PageProps<"/groups/[slug]">) {
  const viewer = await requireUser();
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const group = await load(viewer, slug);
  const filters = feedFiltersSchema.parse(sp);
  const [posts, restriction] = await Promise.all([
    listPosts(viewer, filters, { groupId: group.id }),
    getPostingRestriction(viewer.id),
  ]);
  const staff = can(viewer.role, "content.moderate");
  const basePath = `/groups/${group.slug}`;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/groups">
          <ArrowLeft aria-hidden /> All groups
        </Link>
      </Button>

      <section className="rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <GroupIcon icon={group.icon} name={group.name} size="lg" />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{group.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="tabular-nums">
                  {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
                </span>
                <span aria-hidden>·</span>
                <span>Since {formatDate(group.createdAt)}</span>
                {group.myRole === "MANAGER" ? <Badge variant="secondary">You manage this group</Badge> : null}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {group.canEditDescription ? (
              <GroupFormDialog
                group={{ id: group.id, name: group.name, description: group.description, icon: group.icon }}
                descriptionOnly={!group.canManage}
              />
            ) : null}
            {group.canManage ? <DeleteGroupButton groupId={group.id} groupName={group.name} /> : null}
            <MembershipButton
              groupId={group.id}
              groupName={group.name}
              joined={group.joined}
              isManager={group.myRole === "MANAGER"}
              size="default"
            />
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed whitespace-pre-wrap">{group.description}</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold">Discussion</h2>
          {!group.joined ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed bg-card/50 p-4 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                <Lock className="size-4" aria-hidden /> Only members can post here. Join to share with the group.
              </p>
              <MembershipButton groupId={group.id} groupName={group.name} joined={false} />
            </div>
          ) : restriction ? (
            <RestrictionNotice restriction={restriction} />
          ) : (
            <PostComposer
              viewer={{ fullName: viewer.fullName, avatarKey: viewer.avatarKey }}
              allowAnnouncement={staff}
              groupId={group.id}
              placeholderTitle={`Post in ${group.name}`}
            />
          )}
          <FeedFilters filters={filters} basePath={basePath} />
          <PostList
            result={posts}
            allowAnnouncement={staff}
            basePath={basePath}
            searchParams={sp}
            filtered={Boolean(filters.q || filters.type)}
            emptyTitle="No discussions yet"
            emptyDescription={group.joined ? "Kick things off with the first post." : "Join the group and start the first discussion."}
          />
        </div>
        <aside className="lg:col-span-1">
          <MemberList groupId={group.id} members={group.members} canManage={group.canManage} viewerId={viewer.id} />
        </aside>
      </div>
    </div>
  );
}
