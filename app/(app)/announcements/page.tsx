import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone, Plus, Search, X } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { listAnnouncements } from "@/services/announcements";
import { announcementFiltersSchema } from "@/lib/validation/announcements";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { AnnouncementCard } from "@/components/announcements/announcement-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ANNOUNCEMENT_CATEGORY_LABELS, options } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage({ searchParams }: PageProps<"/announcements">) {
  const viewer = await requireUser();
  const sp = await searchParams;
  const filters = announcementFiltersSchema.parse(sp);
  const result = await listAnnouncements(viewer, filters);
  const canManage = can(viewer.role, "announcements.manage");
  const hasFilters = Boolean(filters.q || filters.category);

  const tabHref = (view: "active" | "archived") => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.category) params.set("category", filters.category);
    if (view === "archived") params.set("view", "archived");
    const qs = params.toString();
    return qs ? `/announcements?${qs}` : "/announcements";
  };

  return (
    <>
      <PageHeader
        title="Announcements"
        description="Official notices from the batch admins — academics, events, careers and emergencies."
        actions={
          canManage ? (
            <Button asChild>
              <Link href="/announcements/new">
                <Plus aria-hidden /> New announcement
              </Link>
            </Button>
          ) : null
        }
      />

      <nav aria-label="Announcement views" className="mb-4 inline-flex rounded-lg bg-muted p-[3px]">
        {(["active", "archived"] as const).map((v) => (
          <Link
            key={v}
            href={tabHref(v)}
            aria-current={filters.view === v ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              filters.view === v && "bg-background text-foreground shadow-sm dark:bg-input/30",
            )}
          >
            {v === "active" ? "Active" : "Archived & expired"}
          </Link>
        ))}
      </nav>

      <form method="get" className="mb-6 flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs sm:flex-row">
        {filters.view === "archived" ? <input type="hidden" name="view" value="archived" /> : null}
        <div className="relative flex-1">
          <label htmlFor="ann-q" className="sr-only">
            Search announcements
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="ann-q" name="q" defaultValue={filters.q} placeholder="Search title or message…" className="h-9 pl-9" />
        </div>
        <div className="flex gap-2">
          <label htmlFor="ann-category" className="sr-only">
            Category
          </label>
          <NativeSelect id="ann-category" name="category" defaultValue={filters.category ?? ""} className="flex-1 sm:w-44 [&_select]:h-9">
            <NativeSelectOption value="">All categories</NativeSelectOption>
            {options(ANNOUNCEMENT_CATEGORY_LABELS).map((o) => (
              <NativeSelectOption key={o.value} value={o.value}>
                {o.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Button type="submit" className="h-9">
            Apply
          </Button>
          {hasFilters ? (
            <Link
              href={filters.view === "archived" ? "/announcements?view=archived" : "/announcements"}
              className={cn(buttonVariants({ variant: "ghost" }), "h-9")}
              aria-label="Clear filters"
            >
              <X aria-hidden />
            </Link>
          ) : null}
        </div>
      </form>

      {result.items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={hasFilters ? "No announcements match" : filters.view === "archived" ? "Nothing archived yet" : "No announcements right now"}
          description={
            hasFilters
              ? "Try a different search term or category."
              : filters.view === "archived"
                ? "Archived and expired announcements will show up here."
                : "When admins post something new, you'll see it here and get a notification."
          }
        />
      ) : (
        <ul className="space-y-4">
          {result.items.map((a) => (
            <li key={a.id}>
              <AnnouncementCard announcement={a} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} basePath="/announcements" searchParams={sp} />
    </>
  );
}
