import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Download, Library, Lock, Search, SlidersHorizontal, X } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import {
  canShareResources,
  getResourceStats,
  listResourceCourses,
  listResources,
} from "@/services/resources";
import { resourceFiltersSchema } from "@/lib/validation/resources";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { StatCard } from "@/components/shared/stat-card";
import { ResourceCard } from "@/components/resources/resource-card";
import { ResourceFormDialog } from "@/components/resources/resource-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RESOURCE_CATEGORY_LABELS, options } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Academic Resources" };

export default async function ResourcesPage({ searchParams }: PageProps<"/resources">) {
  const viewer = await requireUser();
  const sp = await searchParams;
  const filters = resourceFiltersSchema.parse(sp);
  const [result, courses, stats, canShare] = await Promise.all([
    listResources(viewer, filters),
    listResourceCourses(),
    getResourceStats(),
    canShareResources(viewer),
  ]);
  const active = [filters.q, filters.category, filters.course].filter(Boolean).length;

  const categoryHref = (category?: string) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.course) params.set("course", filters.course);
    if (filters.sort !== "newest") params.set("sort", filters.sort);
    if (category) params.set("category", category);
    const qs = params.toString();
    return qs ? `/resources?${qs}` : "/resources";
  };

  return (
    <>
      <PageHeader
        title="Academic Resource Hub"
        description="Notes, slides, previous questions and useful links shared by CSE 24 — organised by course."
        actions={
          canShare ? (
            <ResourceFormDialog courses={courses.map((c) => c.course)} />
          ) : (
            <Button disabled title="An admin has paused student uploads">
              <Lock aria-hidden /> Sharing paused
            </Button>
          )
        }
      />
      {!canShare ? (
        <p className="-mt-3 mb-6 text-sm text-muted-foreground">
          Student uploads are currently turned off by an admin. You can still browse and download everything.
        </p>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Resources" value={stats.total} icon={Library} />
        <StatCard label="Courses" value={courses.length} icon={BookOpen} tone="teal" />
        <StatCard label="Downloads" value={stats.downloads} icon={Download} tone="amber" />
      </div>

      <nav aria-label="Categories" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Link
          href={categoryHref()}
          aria-current={!filters.category ? "page" : undefined}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
            !filters.category ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          All
        </Link>
        {options(RESOURCE_CATEGORY_LABELS).map((o) => (
          <Link
            key={o.value}
            href={categoryHref(o.value)}
            aria-current={filters.category === o.value ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              filters.category === o.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {o.label}
            {stats.byCategory[o.value] ? (
              <span className="ml-1 text-xs opacity-70 tabular-nums">{stats.byCategory[o.value]}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      <form method="get" className="mb-6 rounded-2xl border bg-card p-4 shadow-xs">
        {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <label htmlFor="res-q" className="sr-only">
              Search resources
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="res-q" name="q" defaultValue={filters.q} placeholder="Search title, description or course…" className="h-9 pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            <label htmlFor="res-course" className="sr-only">
              Course
            </label>
            <NativeSelect id="res-course" name="course" defaultValue={filters.course ?? ""} className="w-40 [&_select]:h-9">
              <NativeSelectOption value="">All courses</NativeSelectOption>
              {courses.map((c) => (
                <NativeSelectOption key={c.course} value={c.course}>
                  {c.course} ({c.count})
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <label htmlFor="res-sort" className="sr-only">
              Sort by
            </label>
            <NativeSelect id="res-sort" name="sort" defaultValue={filters.sort} className="w-40 [&_select]:h-9">
              <NativeSelectOption value="newest">Newest first</NativeSelectOption>
              <NativeSelectOption value="downloads">Most downloaded</NativeSelectOption>
            </NativeSelect>
            <Button type="submit" className="h-9">
              <SlidersHorizontal aria-hidden /> Apply
            </Button>
          </div>
        </div>
        {active ? (
          <Link href="/resources" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <X className="size-3.5" aria-hidden /> Clear all filters
          </Link>
        ) : null}
      </form>

      {result.resources.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={active ? "No resources match your filters" : "No resources yet"}
          description={
            active
              ? "Try another course or category, or clear the search."
              : canShare
                ? "Be the first to share notes or slides with the batch."
                : "Resources shared by admins will appear here."
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
            {result.total} resource{result.total === 1 ? "" : "s"}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.resources.map((r) => (
              <li key={r.id}>
                <ResourceCard resource={r} />
              </li>
            ))}
          </ul>
        </>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} basePath="/resources" searchParams={sp} />
    </>
  );
}
