import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText, SlidersHorizontal, X } from "lucide-react";
import { requirePermission } from "@/lib/auth/current-user";
import { listAuditLogs } from "@/services/audit-log";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { formatDateTime } from "@/lib/time";

export const metadata: Metadata = { title: "Audit log · Admin" };

function entityHref(entityType: string, entityId: string | null) {
  if (!entityId) return null;
  if (entityType === "User") return `/admin/students/${entityId}`;
  if (entityType === "Post") return `/feed/${entityId}`;
  return null;
}

export default async function AuditLogPage({ searchParams }: PageProps<"/admin/audit">) {
  const viewer = await requirePermission("audit.view");
  const sp = await searchParams;
  const result = await listAuditLogs(viewer, sp);
  const f = result.filters;
  const activeFilters = [f.action, f.actor, f.entity, f.entityId, f.from, f.to].filter(Boolean).length;

  return (
    <>
      <PageHeader title="Audit log" description={`${result.total} recorded staff action${result.total === 1 ? "" : "s"}${activeFilters ? " match your filters" : ""}.`} />

      <form method="get" className="mb-5 rounded-2xl border bg-card p-4 shadow-xs">
        {f.entityId ? <input type="hidden" name="entityId" value={f.entityId} /> : null}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
          <div>
            <label htmlFor="au-action" className="mb-1 block text-xs font-medium text-muted-foreground">
              Action starts with
            </label>
            <Input id="au-action" name="action" defaultValue={f.action} placeholder="e.g. students." />
          </div>
          <div>
            <label htmlFor="au-actor" className="mb-1 block text-xs font-medium text-muted-foreground">
              Actor roll
            </label>
            <Input id="au-actor" name="actor" defaultValue={f.actor} placeholder="e.g. 2024331001" />
          </div>
          <div>
            <label htmlFor="au-entity" className="mb-1 block text-xs font-medium text-muted-foreground">
              Entity type
            </label>
            <NativeSelect id="au-entity" name="entity" defaultValue={f.entity ?? ""} className="w-full">
              <NativeSelectOption value="">Any entity</NativeSelectOption>
              {result.entityTypes.map((e) => (
                <NativeSelectOption key={e} value={e}>
                  {e}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div>
            <label htmlFor="au-from" className="mb-1 block text-xs font-medium text-muted-foreground">
              From
            </label>
            <Input id="au-from" name="from" type="date" defaultValue={f.from} />
          </div>
          <div>
            <label htmlFor="au-to" className="mb-1 block text-xs font-medium text-muted-foreground">
              To
            </label>
            <Input id="au-to" name="to" type="date" defaultValue={f.to} />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              <SlidersHorizontal aria-hidden /> Filter
            </Button>
          </div>
        </div>
        {activeFilters ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {f.entityId ? (
              <Badge variant="secondary" className="font-mono">
                entity id: {f.entityId}
              </Badge>
            ) : null}
            <Link href="/admin/audit" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              <X className="size-3.5" aria-hidden /> Clear filters
            </Link>
          </div>
        ) : null}
      </form>

      {result.entries.length === 0 ? (
        <EmptyState icon={ScrollText} title="No audit entries" description={activeFilters ? "Try widening the filters." : "Staff actions will be recorded here."} />
      ) : (
        <ol className="divide-y overflow-hidden rounded-2xl border bg-card shadow-xs">
          {result.entries.map((e) => {
            const href = entityHref(e.entityType, e.entityId);
            const hasMeta = e.metadata !== null && e.metadata !== undefined && !(typeof e.metadata === "object" && Object.keys(e.metadata).length === 0);
            return (
              <li key={e.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[11rem_minmax(0,1fr)_12rem] md:gap-4">
                <div className="text-xs text-muted-foreground md:text-sm">
                  <time dateTime={e.createdAt.toISOString()}>{formatDateTime(e.createdAt)}</time>
                  <p className="font-mono text-[11px]">{e.ipAddress ?? "—"}</p>
                </div>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{e.action}</code>
                    <span className="text-xs text-muted-foreground">
                      {e.entityType}
                      {e.entityId ? (
                        <>
                          {" · "}
                          {href ? (
                            <Link href={href} className="font-mono text-primary hover:underline">
                              {e.entityId}
                            </Link>
                          ) : (
                            <span className="font-mono">{e.entityId}</span>
                          )}
                        </>
                      ) : null}
                    </span>
                  </p>
                  {hasMeta ? (
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-xs font-medium text-muted-foreground select-none hover:text-foreground">
                        Details
                      </summary>
                      <pre className="mt-1.5 max-h-64 overflow-auto rounded-lg bg-muted/60 p-2 font-mono text-xs whitespace-pre-wrap break-all">
                        {JSON.stringify(e.metadata, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
                <div className="text-xs md:text-right">
                  {e.actor ? (
                    <>
                      <p className="font-medium">{e.actor.name}</p>
                      <p className="font-mono text-muted-foreground">{e.actor.roll}</p>
                    </>
                  ) : (
                    <p className="text-muted-foreground">System / removed account</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} basePath="/admin/audit" searchParams={sp} />
    </>
  );
}
