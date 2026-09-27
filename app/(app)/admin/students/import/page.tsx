import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { requirePermission } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/shared/page-header";
import { ImportWizard } from "@/components/admin/import-wizard";

export const metadata: Metadata = { title: "Import students · Admin" };

export default async function ImportStudentsPage() {
  await requirePermission("students.import");
  return (
    <>
      <Link href="/admin/students" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All students
      </Link>
      <PageHeader
        title="Import students"
        description="Create accounts for the whole batch from a CSV. Validate first, then import only the valid rows."
      />
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-chart-3/30 bg-chart-3/5 p-4 text-sm">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-chart-3" aria-hidden />
        <p>
          Every imported student&apos;s initial password is their roll number. They are forced to choose a new password at their first
          sign-in. Passwords are never shown or stored in plain text.
        </p>
      </div>
      <ImportWizard />
    </>
  );
}
