import type { Metadata } from "next";
import Link from "next/link";
import { Search, SlidersHorizontal, UserPlus, Users, X } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { findMatchingStudents, listPopularRequestSkills, listTeammateRequests } from "@/services/teammates";
import { getDirectoryFacets } from "@/services/directory";
import { teammateFiltersSchema } from "@/lib/validation/teammates";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StudentCard } from "@/components/students/student-card";
import { TeammateRequestCard } from "@/components/teammates/request-card";
import { TeammateRequestDialog } from "@/components/teammates/request-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Find a Teammate" };

export default async function TeammatesPage({ searchParams }: PageProps<"/teammates">) {
  const viewer = await requireUser();
  const sp = await searchParams;
  const filters = teammateFiltersSchema.parse(sp);
  const [requests, matching, popular, facets] = await Promise.all([
    listTeammateRequests(viewer, filters),
    findMatchingStudents(viewer, filters.skills),
    listPopularRequestSkills(),
    getDirectoryFacets(),
  ]);
  const active = Boolean(filters.q || filters.skills.length || filters.closed || filters.mine);

  const skillsHref = (skills: string[]) => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.closed) params.set("closed", "1");
    if (filters.mine) params.set("mine", "1");
    if (skills.length) params.set("skills", skills.join(","));
    const qs = params.toString();
    return qs ? `/teammates?${qs}` : "/teammates";
  };
  const toggleSkill = (s: string) =>
    skillsHref(filters.skills.includes(s) ? filters.skills.filter((x) => x !== s) : [...filters.skills, s]);

  return (
    <>
      <PageHeader
        title="Find a Teammate"
        description="Looking for a hackathon squad, a research partner or a co-founder? Post what you need or browse open requests."
        actions={<TeammateRequestDialog skillSuggestions={facets.skills.map((s) => s.name)} />}
      />

      <form method="get" className="mb-6 rounded-2xl border bg-card p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <label htmlFor="tm-q" className="sr-only">
              Search requests
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="tm-q" name="q" defaultValue={filters.q} placeholder="Search ideas…" className="h-9 pl-9" />
          </div>
          <div className="lg:w-72">
            <label htmlFor="tm-skills" className="sr-only">
              Skills (comma-separated)
            </label>
            <Input
              id="tm-skills"
              name="skills"
              defaultValue={filters.skills.join(", ")}
              placeholder="Skills, e.g. ai/ml, react"
              className="h-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="mine" value="1" defaultChecked={filters.mine} /> Mine
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="closed" value="1" defaultChecked={filters.closed} /> Include closed
            </label>
            <Button type="submit" className="h-9">
              <SlidersHorizontal aria-hidden /> Apply
            </Button>
          </div>
        </div>
        {popular.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-muted-foreground">Popular:</span>
            {popular.map((p) => {
              const on = filters.skills.includes(p.skill);
              return (
                <Link
                  key={p.skill}
                  href={toggleSkill(p.skill)}
                  aria-current={on ? "true" : undefined}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-xs font-medium capitalize transition-colors",
                    on ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                  )}
                >
                  {p.skill} <span className="opacity-60">{p.count}</span>
                </Link>
              );
            })}
          </div>
        ) : null}
        {active ? (
          <Link href="/teammates" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <X className="size-3.5" aria-hidden /> Clear all filters
          </Link>
        ) : null}
      </form>

      <div className="grid gap-6 xl:grid-cols-3">
        <section aria-labelledby="req-title" className="xl:col-span-2">
          <h2 id="req-title" className="mb-3 text-lg font-semibold">
            {filters.closed ? "Requests" : "Open requests"} <span className="text-muted-foreground">· {requests.length}</span>
          </h2>
          {requests.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title={active ? "No requests match" : "No open requests yet"}
              description={
                filters.skills.length
                  ? "No request needs all of those skills. Remove one, or check the matching students instead."
                  : "Post the first one — describe your idea and the skills you need."
              }
            />
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {requests.map((r) => (
                <li key={r.id}>
                  <TeammateRequestCard request={r} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside aria-labelledby="match-title" className="space-y-3">
          <div className="rounded-2xl border bg-card p-5 shadow-xs">
            <h2 id="match-title" className="flex items-center gap-2 font-semibold">
              <Users className="size-4 text-primary" aria-hidden /> Matching students
            </h2>
            {filters.skills.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Filter by skills (e.g. <span className="font-medium">ai/ml, react</span>) to find batchmates who have all of them on
                their profile.
              </p>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  {matching.total} member{matching.total === 1 ? "" : "s"} with{" "}
                  <span className="font-medium text-foreground capitalize">{filters.skills.join(" + ")}</span>
                </p>
                {matching.students.length ? (
                  <ul className="mt-3 space-y-2">
                    {matching.students.map((s) => (
                      <li key={s.userId}>
                        <StudentCard student={s} layout="list" />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Nobody lists all of these skills yet.</p>
                )}
                {matching.total > matching.students.length ? (
                  <p className="mt-3 text-xs text-muted-foreground">Showing {matching.students.length} of {matching.total}.</p>
                ) : null}
              </>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
