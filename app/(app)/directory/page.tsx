import type { Metadata } from "next";
import Link from "next/link";
import { LayoutGrid, List, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { directoryFiltersSchema, getDirectoryFacets, searchDirectory } from "@/services/directory";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { StudentCard } from "@/components/students/student-card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { EMPLOYMENT_LABELS, options } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Batch Directory" };

export default async function DirectoryPage({ searchParams }: PageProps<"/directory">) {
  const viewer = await requireUser();
  const sp = await searchParams;
  const filters = directoryFiltersSchema.parse(sp);
  const layout = sp.view === "list" ? "list" : "grid";
  const [result, facets] = await Promise.all([searchDirectory(viewer, filters), getDirectoryFacets()]);
  const activeFilters = [filters.q, filters.skill, filters.location, filters.company, filters.interest, filters.status].filter(Boolean).length;

  const viewHref = (v: "grid" | "list") => {
    const params = new URLSearchParams();
    for (const [k, val] of Object.entries(sp)) if (typeof val === "string" && k !== "view") params.set(k, val);
    if (v === "list") params.set("view", "list");
    const qs = params.toString();
    return qs ? `/directory?${qs}` : "/directory";
  };

  return (
    <>
      <PageHeader
        title="Batch Directory"
        description={`${result.total} verified CSE 24 member${result.total === 1 ? "" : "s"}${activeFilters ? " match your filters" : ""}. Only details each student chose to share are shown.`}
        actions={
          <div className="flex rounded-lg border p-0.5" role="group" aria-label="Layout">
            <Link
              href={viewHref("grid")}
              aria-current={layout === "grid" ? "true" : undefined}
              className={cn(buttonVariants({ variant: layout === "grid" ? "secondary" : "ghost", size: "sm" }))}
            >
              <LayoutGrid aria-hidden /> Grid
            </Link>
            <Link
              href={viewHref("list")}
              aria-current={layout === "list" ? "true" : undefined}
              className={cn(buttonVariants({ variant: layout === "list" ? "secondary" : "ghost", size: "sm" }))}
            >
              <List aria-hidden /> List
            </Link>
          </div>
        }
      />

      <form method="get" className="mb-6 rounded-2xl border bg-card p-4 shadow-xs">
        {layout === "list" ? <input type="hidden" name="view" value="list" /> : null}
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <label htmlFor="dir-q" className="sr-only">
              Search by name or roll
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="dir-q" name="q" defaultValue={filters.q} placeholder="Search by name, nickname or roll…" className="h-9 pl-9" />
          </div>
          <div className="flex gap-2">
            <label htmlFor="dir-sort" className="sr-only">
              Sort by
            </label>
            <NativeSelect id="dir-sort" name="sort" defaultValue={filters.sort} className="w-36 [&_select]:h-9">
              <NativeSelectOption value="roll">Sort: Roll</NativeSelectOption>
              <NativeSelectOption value="name">Sort: Name</NativeSelectOption>
              <NativeSelectOption value="recent">Recently updated</NativeSelectOption>
            </NativeSelect>
            <Button type="submit" className="h-9">
              <SlidersHorizontal aria-hidden /> Apply
            </Button>
          </div>
        </div>
        <details className="group mt-3" open={activeFilters > (filters.q ? 1 : 0)}>
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground select-none hover:text-foreground">
            More filters
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label htmlFor="dir-skill" className="mb-1 block text-xs font-medium text-muted-foreground">
                Skill
              </label>
              <NativeSelect id="dir-skill" name="skill" defaultValue={filters.skill ?? ""} className="w-full">
                <NativeSelectOption value="">Any skill</NativeSelectOption>
                {facets.skills.map((s) => (
                  <NativeSelectOption key={s.slug} value={s.name}>
                    {s.name} ({s.count})
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div>
              <label htmlFor="dir-interest" className="mb-1 block text-xs font-medium text-muted-foreground">
                Interest
              </label>
              <NativeSelect id="dir-interest" name="interest" defaultValue={filters.interest ?? ""} className="w-full">
                <NativeSelectOption value="">Any interest</NativeSelectOption>
                {facets.interests.map((i) => (
                  <NativeSelectOption key={i} value={i}>
                    {i}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div>
              <label htmlFor="dir-location" className="mb-1 block text-xs font-medium text-muted-foreground">
                Location
              </label>
              <Input id="dir-location" name="location" defaultValue={filters.location} placeholder="e.g. Sylhet" />
            </div>
            <div>
              <label htmlFor="dir-company" className="mb-1 block text-xs font-medium text-muted-foreground">
                Company
              </label>
              <Input id="dir-company" name="company" defaultValue={filters.company} placeholder="e.g. Pathao" />
            </div>
            <div>
              <label htmlFor="dir-status" className="mb-1 block text-xs font-medium text-muted-foreground">
                Career status
              </label>
              <NativeSelect id="dir-status" name="status" defaultValue={filters.status ?? ""} className="w-full">
                <NativeSelectOption value="">Any status</NativeSelectOption>
                {options(EMPLOYMENT_LABELS).map((o) => (
                  <NativeSelectOption key={o.value} value={o.value}>
                    {o.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          </div>
        </details>
        {activeFilters ? (
          <Link href={layout === "list" ? "/directory?view=list" : "/directory"} className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <X className="size-3.5" aria-hidden /> Clear all filters
          </Link>
        ) : null}
      </form>

      {result.students.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No batch members found"
          description="Try a different name or remove some filters. Location and career filters only match students who share those details."
        />
      ) : layout === "grid" ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.students.map((s) => (
            <li key={s.userId}>
              <StudentCard student={s} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {result.students.map((s) => (
            <li key={s.userId}>
              <StudentCard student={s} layout="list" />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} basePath="/directory" searchParams={sp} />
    </>
  );
}
