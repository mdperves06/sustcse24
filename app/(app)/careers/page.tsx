import type { Metadata } from "next";
import Link from "next/link";
import { Building2, Factory, Network, Search, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { careerFiltersSchema, getCareerSummary, searchCareerNetwork } from "@/services/careers";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { CareerCard } from "@/components/careers/career-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { EMPLOYMENT_LABELS, options } from "@/lib/labels";

export const metadata: Metadata = { title: "Career Network" };

function RankList({
  title,
  icon: Icon,
  items,
  param,
}: {
  title: string;
  icon: typeof Factory;
  items: { name: string; count: number }[];
  param: "industry" | "company";
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-xs">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4 text-primary" aria-hidden /> {title}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data shared yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => (
            <li key={i.name}>
              <Link href={`/careers?${param}=${encodeURIComponent(i.name)}`} className="group block">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate group-hover:underline">{i.name}</span>
                  <span className="ml-2 text-muted-foreground tabular-nums">{i.count}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${(i.count / max) * 100}%` }} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function CareersPage({ searchParams }: PageProps<"/careers">) {
  const viewer = await requireUser();
  const sp = await searchParams;
  const filters = careerFiltersSchema.parse(sp);
  const [result, summary] = await Promise.all([searchCareerNetwork(viewer, filters), getCareerSummary()]);
  const active = [filters.q, filters.industry, filters.company, filters.location, filters.status].filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="Career Network"
        description="Where CSE 24 works, interns and studies. Only members who share their career details with the batch appear here."
      />

      <section aria-label="Career summary" className="mb-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-xs">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <Network className="size-4 text-primary" aria-hidden /> Members sharing career info
          </h2>
          <p className="text-3xl font-semibold tabular-nums">{summary.total}</p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {summary.byStatus.map((s) => (
              <li key={s.status}>
                <Link
                  href={`/careers?status=${s.status}`}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium hover:bg-muted"
                  aria-current={filters.status === s.status ? "true" : undefined}
                >
                  {EMPLOYMENT_LABELS[s.status]} <span className="text-muted-foreground tabular-nums">{s.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <RankList title="Top industries" icon={Factory} items={summary.topIndustries} param="industry" />
        <RankList title="Top companies" icon={Building2} items={summary.topCompanies} param="company" />
      </section>

      <form method="get" className="mb-6 rounded-2xl border bg-card p-4 shadow-xs">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative sm:col-span-2">
            <label htmlFor="car-q" className="sr-only">
              Search by name
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="car-q" name="q" defaultValue={filters.q} placeholder="Search name or roll…" className="h-9 pl-9" />
          </div>
          <div>
            <label htmlFor="car-industry" className="sr-only">
              Industry
            </label>
            <Input id="car-industry" name="industry" defaultValue={filters.industry} placeholder="Industry" className="h-9" list="car-industries" />
            <datalist id="car-industries">
              {summary.topIndustries.map((i) => (
                <option key={i.name} value={i.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label htmlFor="car-company" className="sr-only">
              Company
            </label>
            <Input id="car-company" name="company" defaultValue={filters.company} placeholder="Company" className="h-9" />
          </div>
          <div>
            <label htmlFor="car-location" className="sr-only">
              Location
            </label>
            <Input id="car-location" name="location" defaultValue={filters.location} placeholder="Location" className="h-9" />
          </div>
          <div className="flex gap-2">
            <label htmlFor="car-status" className="sr-only">
              Employment status
            </label>
            <NativeSelect id="car-status" name="status" defaultValue={filters.status ?? ""} className="w-full [&_select]:h-9">
              <NativeSelectOption value="">Any status</NativeSelectOption>
              {options(EMPLOYMENT_LABELS).map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <Button type="submit" className="h-9" aria-label="Apply filters">
              <SlidersHorizontal aria-hidden />
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" aria-hidden /> Location filters only match members who share their location.
          </p>
          {active ? (
            <Link href="/careers" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              <X className="size-3.5" aria-hidden /> Clear all filters
            </Link>
          ) : null}
        </div>
      </form>

      {result.members.length === 0 ? (
        <EmptyState
          icon={Network}
          title={active ? "No members match these filters" : "No career details shared yet"}
          description={
            active
              ? "Try a broader industry or company name."
              : "Add your organization and position in your profile (and keep career details visible) to appear here."
          }
          action={
            !active ? (
              <Button variant="outline" asChild>
                <Link href="/profile/edit">Update my career info</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
            {result.total} member{result.total === 1 ? "" : "s"}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.members.map((m) => (
              <li key={m.userId}>
                <CareerCard member={m} />
              </li>
            ))}
          </ul>
        </>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} basePath="/careers" searchParams={sp} />
    </>
  );
}
