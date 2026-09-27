import type { Metadata } from "next";
import Link from "next/link";
import { FileUp, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { requirePermission } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/permissions";
import { listStudents } from "@/services/admin-users";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Pagination } from "@/components/shared/pagination";
import { UserAvatar } from "@/components/shared/user-avatar";
import { AccountBadges, CompletionMeter, RoleBadge } from "@/components/admin/badges";
import { CreateStudentDialog } from "@/components/admin/create-student-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ROLE_LABELS, options } from "@/lib/labels";
import { formatDateTime, formatRelative } from "@/lib/time";

export const metadata: Metadata = { title: "Students · Admin" };

const FLAG_LABELS = {
  default_password: "Default password",
  locked: "Locked",
  restricted: "Posting restricted",
  unverified: "Unverified profile",
} as const;

export default async function AdminStudentsPage({ searchParams }: PageProps<"/admin/students">) {
  const viewer = await requirePermission("students.manage");
  const sp = await searchParams;
  const result = await listStudents(viewer, sp);
  const f = result.filters;
  const activeFilters = [f.q, f.role, f.status, f.flag, f.deleted].filter(Boolean).length;
  const detailHref = (id: string) => `/admin/students/${id}`;

  return (
    <>
      <PageHeader
        title="Students"
        description={`${result.total} ${f.deleted ? "deleted " : ""}account${result.total === 1 ? "" : "s"}${activeFilters ? " match your filters" : ""}.`}
        actions={
          <>
            {can(viewer.role, "students.import") ? (
              <Button asChild variant="outline">
                <Link href="/admin/students/import">
                  <FileUp aria-hidden /> Import CSV
                </Link>
              </Button>
            ) : null}
            <CreateStudentDialog />
          </>
        }
      />

      <form method="get" className="mb-5 rounded-2xl border bg-card p-4 shadow-xs">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <label htmlFor="st-q" className="sr-only">
              Search by roll, name, email or student ID
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="st-q" name="q" defaultValue={f.q} placeholder="Search roll, name, email or student ID…" className="h-9 pl-9" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <label htmlFor="st-role" className="sr-only">
              Role
            </label>
            <NativeSelect id="st-role" name="role" defaultValue={f.role ?? ""} className="w-full sm:w-36 [&_select]:h-9">
              <NativeSelectOption value="">All roles</NativeSelectOption>
              {options(ROLE_LABELS).map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <label htmlFor="st-status" className="sr-only">
              Status
            </label>
            <NativeSelect id="st-status" name="status" defaultValue={f.status ?? ""} className="w-full sm:w-36 [&_select]:h-9">
              <NativeSelectOption value="">Any status</NativeSelectOption>
              <NativeSelectOption value="active">Active</NativeSelectOption>
              <NativeSelectOption value="disabled">Disabled</NativeSelectOption>
            </NativeSelect>
            <label htmlFor="st-flag" className="sr-only">
              Flag
            </label>
            <NativeSelect id="st-flag" name="flag" defaultValue={f.flag ?? ""} className="w-full sm:w-44 [&_select]:h-9">
              <NativeSelectOption value="">Any flag</NativeSelectOption>
              {Object.entries(FLAG_LABELS).map(([value, label]) => (
                <NativeSelectOption key={value} value={value}>
                  {label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <label htmlFor="st-deleted" className="sr-only">
              Deleted accounts
            </label>
            <NativeSelect id="st-deleted" name="deleted" defaultValue={f.deleted ?? ""} className="w-full sm:w-40 [&_select]:h-9">
              <NativeSelectOption value="">Current accounts</NativeSelectOption>
              <NativeSelectOption value="1">Deleted accounts</NativeSelectOption>
            </NativeSelect>
            <Button type="submit" className="col-span-2 h-9 sm:col-span-1">
              <SlidersHorizontal aria-hidden /> Apply
            </Button>
          </div>
        </div>
        {activeFilters ? (
          <Link href="/admin/students" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <X className="size-3.5" aria-hidden /> Clear filters
          </Link>
        ) : null}
      </form>

      {result.students.length === 0 ? (
        <EmptyState
          icon={Users}
          title={activeFilters ? "No accounts match these filters" : "No students yet"}
          description={activeFilters ? "Try a different search or clear the filters." : "Add students one by one or import a CSV of the batch."}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border bg-card shadow-xs md:block">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="pl-4">Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead className="pr-4">Profile</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-4">
                      <Link
                        href={detailHref(s.id)}
                        className="flex items-center gap-3 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      >
                        <UserAvatar name={s.fullName} avatarKey={s.avatarKey} size="sm" />
                        <span className="min-w-0">
                          <span className="block max-w-56 truncate font-medium hover:underline">{s.fullName}</span>
                          <span className="block font-mono text-xs text-muted-foreground">{s.roll}</span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-56 truncate text-muted-foreground">{s.email ?? "—"}</TableCell>
                    <TableCell>
                      <RoleBadge role={s.role} />
                    </TableCell>
                    <TableCell>
                      <AccountBadges
                        status={s.status}
                        deleted={s.deleted}
                        locked={s.locked}
                        mustChangePassword={s.mustChangePassword}
                        restricted={Boolean(s.restrictedUntil)}
                        compact
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.lastLoginAt ? <time dateTime={s.lastLoginAt.toISOString()} title={formatDateTime(s.lastLoginAt)}>{formatRelative(s.lastLoginAt)}</time> : "Never"}
                    </TableCell>
                    <TableCell className="pr-4">
                      <CompletionMeter value={s.completion} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {result.students.map((s) => (
              <li key={s.id}>
                <Link
                  href={detailHref(s.id)}
                  className="block rounded-xl border bg-card p-3 shadow-xs transition-colors hover:border-primary/30 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <div className="flex items-center gap-3">
                    <UserAvatar name={s.fullName} avatarKey={s.avatarKey} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{s.fullName}</p>
                      <p className="truncate font-mono text-xs text-muted-foreground">{s.roll}</p>
                    </div>
                    <RoleBadge role={s.role} />
                  </div>
                  {s.email ? <p className="mt-2 truncate text-xs text-muted-foreground">{s.email}</p> : null}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <AccountBadges
                      status={s.status}
                      deleted={s.deleted}
                      locked={s.locked}
                      mustChangePassword={s.mustChangePassword}
                      restricted={Boolean(s.restrictedUntil)}
                    />
                    <CompletionMeter value={s.completion} />
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Last login: {s.lastLoginAt ? formatRelative(s.lastLoginAt) : "never"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <Pagination page={result.page} pageCount={result.pageCount} basePath="/admin/students" searchParams={sp} />
    </>
  );
}
