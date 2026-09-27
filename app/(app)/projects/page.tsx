import type { Metadata } from "next";
import Link from "next/link";
import { FolderGit2, Heart, Plus, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { getProjectStats, listPopularTechnologies, listProjects } from "@/services/projects";
import { projectFiltersSchema } from "@/lib/validation/projects";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { StatCard } from "@/components/shared/stat-card";
import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PROJECT_CATEGORY_LABELS, options } from "@/lib/labels";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Project Gallery" };

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const viewer = await requireUser();
  const sp = await searchParams;
  const filters = projectFiltersSchema.parse(sp);
  const [result, stats, techs] = await Promise.all([
    listProjects(viewer, filters),
    getProjectStats(),
    listPopularTechnologies(14),
  ]);
  const active = [filters.q, filters.tech, filters.category, filters.bookmarked].filter(Boolean).length;

  const hrefWith = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      q: filters.q,
      tech: filters.tech,
      category: filters.category,
      bookmarked: filters.bookmarked ? "1" : undefined,
      sort: filters.sort !== "newest" ? filters.sort : undefined,
      ...patch,
    };
    for (const [k, v] of Object.entries(base)) if (v) params.set(k, v);
    const qs = params.toString();
    return qs ? `/projects?${qs}` : "/projects";
  };
  const chip = (on: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1 text-sm font-medium transition-colors",
      on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
    );

  return (
    <>
      <PageHeader
        title="Project Gallery"
        description="What CSE 24 is building — web apps, ML models, robots and more."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus aria-hidden /> Add project
            </Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Projects" value={stats.projects} icon={FolderGit2} />
        <StatCard label="Builders" value={stats.contributors} icon={Users} tone="teal" />
        <StatCard label="Likes" value={stats.likes} icon={Heart} tone="pink" />
      </div>

      <nav aria-label="Project categories" className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <Link href={hrefWith({ category: undefined })} aria-current={!filters.category ? "page" : undefined} className={chip(!filters.category)}>
          All
        </Link>
        {options(PROJECT_CATEGORY_LABELS).map((o) => (
          <Link
            key={o.value}
            href={hrefWith({ category: o.value })}
            aria-current={filters.category === o.value ? "page" : undefined}
            className={chip(filters.category === o.value)}
          >
            {o.label}
          </Link>
        ))}
      </nav>

      <form method="get" className="mb-6 rounded-2xl border bg-card p-4 shadow-xs">
        {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
        {filters.tech ? <input type="hidden" name="tech" value={filters.tech} /> : null}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <label htmlFor="proj-q" className="sr-only">
              Search projects
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="proj-q" name="q" defaultValue={filters.q} placeholder="Search title, description or technology…" className="h-9 pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="bookmarked" value="1" defaultChecked={filters.bookmarked} /> Bookmarked
            </label>
            <label htmlFor="proj-sort" className="sr-only">
              Sort by
            </label>
            <NativeSelect id="proj-sort" name="sort" defaultValue={filters.sort} className="w-36 [&_select]:h-9">
              <NativeSelectOption value="newest">Newest</NativeSelectOption>
              <NativeSelectOption value="liked">Most liked</NativeSelectOption>
            </NativeSelect>
            <Button type="submit" className="h-9">
              <SlidersHorizontal aria-hidden /> Apply
            </Button>
          </div>
        </div>
        {techs.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-muted-foreground">Tech:</span>
            {techs.map((t) => {
              const on = filters.tech?.toLowerCase() === t.tech.toLowerCase();
              return (
                <Link
                  key={t.tech}
                  href={hrefWith({ tech: on ? undefined : t.tech, page: undefined })}
                  aria-current={on ? "true" : undefined}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
                    on ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                  )}
                >
                  {t.tech} <span className="opacity-60">{t.count}</span>
                </Link>
              );
            })}
          </div>
        ) : null}
        {active ? (
          <Link href="/projects" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <X className="size-3.5" aria-hidden /> Clear all filters
          </Link>
        ) : null}
      </form>

      {result.projects.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          title={filters.bookmarked ? "No bookmarked projects" : active ? "No projects match your filters" : "No projects yet"}
          description={
            filters.bookmarked
              ? "Bookmark projects you want to come back to."
              : active
                ? "Try another category or technology."
                : "Built something cool? Be the first to showcase it."
          }
          action={
            !active ? (
              <Button asChild>
                <Link href="/projects/new">
                  <Plus aria-hidden /> Add project
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {result.projects.map((p) => (
            <li key={p.id}>
              <ProjectCard project={p} />
            </li>
          ))}
        </ul>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} basePath="/projects" searchParams={sp} />
    </>
  );
}
