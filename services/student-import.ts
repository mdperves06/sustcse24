import "server-only";
import { db } from "@/lib/db";
import { assertCan } from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";
import { ValidationError } from "@/lib/errors";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  createImportedStudents,
  findExistingKeys,
  parseStudentCsv,
  validateImportRows,
  type ImportIssue,
  type ImportRowResult,
  type ImportSummary,
} from "@/lib/csv";
import { importRequestSchema } from "@/lib/validation/admin";
import { recordAudit } from "@/services/audit-log";
import type { Viewer } from "@/lib/privacy";

export type ImportPreview = {
  total: number;
  valid: number;
  invalid: number;
  rows: ImportRowResult[];
};

async function validateCsv(csv: string): Promise<ImportRowResult[]> {
  const parsed = parseStudentCsv(csv);
  if (!parsed.ok) throw new ValidationError(parsed.error, { csv: [parsed.error] });
  const existing = await findExistingKeys(db, parsed.rows);
  return validateImportRows(parsed.rows, existing);
}

function toPreview(rows: ImportRowResult[]): ImportPreview {
  const valid = rows.filter((r) => r.valid).length;
  return { total: rows.length, valid, invalid: rows.length - valid, rows };
}

/** Step 1: parse + validate against the file and the database. Nothing is written. */
export async function previewImport(actor: Viewer, csv: string): Promise<ImportPreview> {
  assertCan(actor, "students.import");
  return toPreview(await validateCsv(csv));
}

/**
 * Step 2: re-validates on the server (the preview is never trusted) and creates only the valid rows.
 * Passwords are hash(roll); they are never returned or logged.
 */
export async function importStudents(actor: Viewer, csv: string): Promise<ImportSummary> {
  assertCan(actor, "students.import");
  await enforceRateLimit(`admin-import:${actor.id}`, 10, 60 * 60, "Too many imports in a short time. Please wait a while.");
  const rows = await validateCsv(csv);
  const summary = await createImportedStudents(db, rows, hashPassword);

  const skippedReasons: Partial<Record<ImportIssue, number>> = {};
  for (const r of summary.results) {
    if (r.created) continue;
    for (const issue of r.issues) skippedReasons[issue] = (skippedReasons[issue] ?? 0) + 1;
  }
  await recordAudit(actor, "students.import", "User", null, {
    total: summary.total,
    created: summary.created,
    skipped: summary.skipped,
    skippedReasons,
  });
  return summary;
}

/** Shared by the server action and the REST endpoint. */
export async function runImportRequest(actor: Viewer, input: unknown) {
  const { csv, dryRun } = importRequestSchema.parse(input);
  if (dryRun) return { dryRun: true as const, preview: await previewImport(actor, csv) };
  return { dryRun: false as const, summary: await importStudents(actor, csv) };
}
