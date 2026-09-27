import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, Briefcase, Flame, Lock, Search, SlidersHorizontal, X } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { canPostOpportunities, getOpportunityCounts, listOpportunities } from "@/services/opportunities";
import { opportunityFiltersSchema } from "@/lib/validation/opportunities";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { StatCard } from "@/components/shared/stat-card";
import { OpportunityCard } from "@/components/opportunities/opportunity-card";
import { CreateOpportunityDialog } from "@/components/opportunities/opportunity-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { OPPORTUNITY_TYPE_LABELS, options } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Opportunities" };

export default async function OpportunitiesPage({ searchParams }: PageProps<"/opportunities">) {
  const viewer = await requireUser();
  const sp = await searchParams;
  const filters = opportunityFiltersSchema.parse(sp);
  const [result, counts, canPost] = await Promise.all([
    listOpportunities(viewer, filters),
    getOpportunityCounts(viewer),
    canPostOpportunities(viewer),
  ]);
  const active = [filters.q, filters.type, filters.saved, filters.expired].filter(Boolean).length;

  const hrefWith = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      q: filters.q,
      type: filters.type,
      saved: filters.saved ? "1" : undefined,
      expired: filters.expired ? "1" : undefined,
      sort: filters.sort !== "newest" ? filters.sort : undefined,
      ...patch,
    };
    for (const [k, v] of Object.entries(base)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/opportunities?${qs}` : "/opportunities";
  };

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
      active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
    );

  return (
    <>
      <PageHeader
        title="Career & Opportunity Board"
        description="Internships, jobs, hackathons, scholarships and research positions shared by the batch."
        actions={
          canPost ? (
            <CreateOpportunityDialog />
          ) : (
            <Button disabled title="An admin has paused student posts">
              <Lock aria-hidden /> Posting paused
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Open now" value={counts.open} icon={Briefcase} href="/opportunities" />
        <StatCard label="Closing in 3 days" value={counts.closingSoon} icon={Flame} tone="amber" href="/opportunities?sort=deadline" />
        <StatCard label="Saved by you" value={counts.saved} icon={Bookmark} tone="teal" href="/opportunities?saved=1" />
      </div>

      <nav aria-label="Opportunity types" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Link href={hrefWith({ type: undefined })} aria-current={!filters.type ? "page" : undefined} className={chip(!filters.type)}>
          All types
        </Link>
        {options(OPPORTUNITY_TYPE_LABELS).map((o) => (
          <Link
            key={o.value}
            href={hrefWith({ type: o.value })}
            aria-current={filters.type === o.value ? "page" : undefined}
            className={chip(filters.type === o.value)}
          >
            {o.label}
          </Link>
        ))}
      </nav>

      <form method="get" className="mb-6 rounded-2xl border bg-card p-4 shadow-xs">
        {filters.type ? <input type="hidden" name="type" value={filters.type} /> : null}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <label htmlFor="opp-q" className="sr-only">
              Search opportunities
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="opp-q" name="q" defaultValue={filters.q} placeholder="Search title, organization, location…" className="h-9 pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="saved" value="1" defaultChecked={filters.saved} /> Saved only
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="expired" value="1" defaultChecked={filters.expired} /> Show expired
            </label>
            <label htmlFor="opp-sort" className="sr-only">
              Sort by
            </label>
            <NativeSelect id="opp-sort" name="sort" defaultValue={filters.sort} className="w-40 [&_select]:h-9">
              <NativeSelectOption value="newest">Newest first</NativeSelectOption>
              <NativeSelectOption value="deadline">Closing soonest</NativeSelectOption>
            </NativeSelect>
            <Button type="submit" className="h-9">
              <SlidersHorizontal aria-hidden /> Apply
            </Button>
          </div>
        </div>
        {active ? (
          <Link href="/opportunities" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <X className="size-3.5" aria-hidden /> Clear all filters
          </Link>
        ) : null}
      </form>

      {result.opportunities.length === 0 ? (
        <EmptyState
          icon={filters.saved ? Bookmark : Briefcase}
          title={filters.saved ? "No saved opportunities" : active ? "Nothing matches your filters" : "No open opportunities right now"}
          description={
            filters.saved
              ? "Tap the bookmark on any opportunity to keep it here."
              : active
                ? "Try another type, or include expired listings."
                : canPost
                  ? "Know about an internship or hackathon? Post it for the batch."
                  : "New opportunities from admins will show up here."
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {result.opportunities.map((o) => (
            <li key={o.id}>
              <OpportunityCard opportunity={o} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} basePath="/opportunities" searchParams={sp} />
    </>
  );
}
