/**
 * CSV parsing and student-import rules.
 *
 * This module is deliberately free of `server-only`, Next.js and path-alias imports so the
 * web import (services/student-import.ts) and the CLI (scripts/import-students.ts) share
 * exactly the same parsing and validation rules.
 */
import { z } from "zod";
import { rollSchema } from "./validation/auth";
import type { PrismaClient } from "./generated/prisma/client";

// ───────────────────────────── Generic CSV ─────────────────────────────

/**
 * RFC 4180-style parser: quoted fields, escaped quotes (""), commas and newlines
 * inside quotes, CRLF / LF / CR line endings and a leading UTF-8 BOM.
 * Completely blank lines are dropped.
 */
export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = "";
  };
  const endRow = () => {
    endField();
    if (!(row.length === 1 && row[0]!.trim() === "")) rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && field.trim() === "") {
      field = "";
      inQuotes = true;
    } else if (ch === ",") {
      endField();
    } else if (ch === "\r") {
      endRow();
      if (text[i + 1] === "\n") i += 1;
    } else if (ch === "\n") {
      endRow();
    } else {
      field += ch;
    }
    i += 1;
  }
  if (field !== "" || row.length > 0) endRow();
  return rows;
}

/** Quotes a value for CSV output when needed. */
export function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// ───────────────────────────── Student import ─────────────────────────────

export const IMPORT_MAX_ROWS = 500;
/** Rough upper bound for the raw CSV (500 rows of generous width). */
export const IMPORT_MAX_BYTES = 512 * 1024;

export const IMPORT_COLUMNS = {
  roll: ["roll", "roll_no", "roll_number", "rollno"],
  name: ["name", "full_name", "fullname"],
  studentId: ["student_id", "studentid", "id_no", "registration", "registration_no"],
  email: ["email", "e-mail", "email_address"],
} as const;

export type ImportRow = {
  /** 1-based line number in the file (header is line 1). */
  line: number;
  roll: string;
  name: string;
  studentId: string | null;
  email: string | null;
};

export type ImportIssue =
  | "missing_roll"
  | "missing_name"
  | "bad_roll"
  | "bad_name"
  | "bad_email"
  | "bad_student_id"
  | "duplicate_roll_in_file"
  | "duplicate_email_in_file"
  | "duplicate_student_id_in_file"
  | "roll_exists"
  | "email_exists"
  | "student_id_exists"
  | "conflict";

export const IMPORT_ISSUE_LABELS: Record<ImportIssue, string> = {
  missing_roll: "Missing roll",
  missing_name: "Missing name",
  bad_roll: "Invalid roll format",
  bad_name: "Name is too long",
  bad_email: "Invalid email",
  bad_student_id: "Invalid student ID",
  duplicate_roll_in_file: "Duplicate roll in file",
  duplicate_email_in_file: "Duplicate email in file",
  duplicate_student_id_in_file: "Duplicate student ID in file",
  roll_exists: "Roll already exists",
  email_exists: "Email already exists",
  student_id_exists: "Student ID already exists",
  conflict: "Roll, email or student ID was taken during import",
};

export type ImportRowResult = ImportRow & { valid: boolean; issues: ImportIssue[] };

export type ParsedImport =
  | { ok: true; rows: ImportRow[] }
  | { ok: false; error: string };

const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/\s+/g, "_");

function findColumn(headers: string[], aliases: readonly string[]): number {
  return headers.findIndex((h) => aliases.includes(h));
}

/** Parses the CSV and maps columns by (case-insensitive, order-independent) header names. */
export function parseStudentCsv(input: string): ParsedImport {
  if (!input.trim()) return { ok: false, error: "The CSV is empty." };
  if (input.length > IMPORT_MAX_BYTES) return { ok: false, error: "The CSV is too large (max 512 KB)." };

  const table = parseCsv(input);
  if (table.length === 0) return { ok: false, error: "The CSV is empty." };

  const headers = table[0]!.map(normalizeHeader);
  const col = {
    roll: findColumn(headers, IMPORT_COLUMNS.roll),
    name: findColumn(headers, IMPORT_COLUMNS.name),
    studentId: findColumn(headers, IMPORT_COLUMNS.studentId),
    email: findColumn(headers, IMPORT_COLUMNS.email),
  };
  if (col.roll < 0 || col.name < 0) {
    return { ok: false, error: 'The header row must contain "roll" and "name" columns (optional: "student_id", "email").' };
  }

  const body = table.slice(1);
  if (body.length === 0) return { ok: false, error: "The CSV has a header row but no students." };
  if (body.length > IMPORT_MAX_ROWS) {
    return { ok: false, error: `A single import is limited to ${IMPORT_MAX_ROWS} rows (this file has ${body.length}).` };
  }

  const cell = (r: string[], idx: number) => (idx >= 0 ? (r[idx] ?? "").trim() : "");
  const rows = body.map((r, i) => ({
    line: i + 2,
    roll: cell(r, col.roll),
    name: cell(r, col.name).replace(/\s+/g, " "),
    studentId: cell(r, col.studentId) || null,
    email: cell(r, col.email).toLowerCase() || null,
  }));
  return { ok: true, rows };
}

const emailSchema = z.email().max(200);
const studentIdSchema = z.string().max(30).regex(/^[A-Za-z0-9/_.-]+$/);

export type ExistingKeys = { rolls: Set<string>; emails: Set<string>; studentIds: Set<string> };

/** Pure per-row validation against the file itself and the keys that already exist in the database. */
export function validateImportRows(rows: ImportRow[], existing: ExistingKeys): ImportRowResult[] {
  const count = (values: (string | null)[]) => {
    const m = new Map<string, number>();
    for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
    return m;
  };
  const rollCounts = count(rows.map((r) => r.roll.toLowerCase()));
  const emailCounts = count(rows.map((r) => r.email));
  const idCounts = count(rows.map((r) => r.studentId?.toLowerCase() ?? null));
  const existingRolls = new Set([...existing.rolls].map((r) => r.toLowerCase()));
  const existingIds = new Set([...existing.studentIds].map((r) => r.toLowerCase()));
  const existingEmails = new Set([...existing.emails].map((r) => r.toLowerCase()));

  return rows.map((row) => {
    const issues: ImportIssue[] = [];
    if (!row.roll) issues.push("missing_roll");
    else if (!rollSchema.safeParse(row.roll).success) issues.push("bad_roll");
    if (!row.name) issues.push("missing_name");
    else if (row.name.length > 100) issues.push("bad_name");
    if (row.email && !emailSchema.safeParse(row.email).success) issues.push("bad_email");
    if (row.studentId && !studentIdSchema.safeParse(row.studentId).success) issues.push("bad_student_id");

    if (row.roll && (rollCounts.get(row.roll.toLowerCase()) ?? 0) > 1) issues.push("duplicate_roll_in_file");
    if (row.email && (emailCounts.get(row.email) ?? 0) > 1) issues.push("duplicate_email_in_file");
    if (row.studentId && (idCounts.get(row.studentId.toLowerCase()) ?? 0) > 1) issues.push("duplicate_student_id_in_file");

    if (row.roll && existingRolls.has(row.roll.toLowerCase())) issues.push("roll_exists");
    if (row.email && existingEmails.has(row.email)) issues.push("email_exists");
    if (row.studentId && existingIds.has(row.studentId.toLowerCase())) issues.push("student_id_exists");

    return { ...row, valid: issues.length === 0, issues };
  });
}

export function describeIssues(issues: ImportIssue[]): string {
  return issues.map((i) => IMPORT_ISSUE_LABELS[i]).join(", ");
}

// ───────────────────────────── Database helpers (shared by web + CLI) ─────────────────────────────

type Client = Pick<PrismaClient, "user" | "studentProfile">;

/** Looks up which rolls / emails / student IDs from the file already exist (including soft-deleted accounts). */
export async function findExistingKeys(client: Client, rows: ImportRow[]): Promise<ExistingKeys> {
  const rolls = [...new Set(rows.map((r) => r.roll).filter(Boolean))];
  const emails = [...new Set(rows.map((r) => r.email).filter((v): v is string => Boolean(v)))];
  const ids = [...new Set(rows.map((r) => r.studentId).filter((v): v is string => Boolean(v)))];

  const [byRoll, byEmail, byId] = await Promise.all([
    rolls.length
      ? client.user.findMany({ where: { roll: { in: rolls, mode: "insensitive" } }, select: { roll: true } })
      : Promise.resolve([]),
    emails.length
      ? client.user.findMany({ where: { email: { in: emails, mode: "insensitive" } }, select: { email: true } })
      : Promise.resolve([]),
    ids.length
      ? client.studentProfile.findMany({ where: { studentId: { in: ids, mode: "insensitive" } }, select: { studentId: true } })
      : Promise.resolve([]),
  ]);

  return {
    rolls: new Set(byRoll.map((u) => u.roll)),
    emails: new Set(byEmail.map((u) => u.email!).filter(Boolean)),
    studentIds: new Set(byId.map((p) => p.studentId!).filter(Boolean)),
  };
}

export type ImportSummary = {
  total: number;
  created: number;
  skipped: number;
  results: (ImportRowResult & { created: boolean })[];
};

/**
 * Creates every valid row (sequentially — bcrypt is intentionally slow). Each account gets
 * password = hash(roll), mustChangePassword = true, a StudentProfile and a PrivacySettings row.
 * A row that races with another writer (unique violation) is reported as a conflict and skipped.
 */
export async function createImportedStudents(
  client: Client,
  results: ImportRowResult[],
  hash: (plain: string) => Promise<string>,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportSummary> {
  const out: ImportSummary["results"] = [];
  const valid = results.filter((r) => r.valid);
  let done = 0;
  for (const row of results) {
    if (!row.valid) {
      out.push({ ...row, created: false });
      continue;
    }
    const passwordHash = await hash(row.roll);
    try {
      await client.user.create({
        data: {
          roll: row.roll,
          email: row.email,
          passwordHash,
          mustChangePassword: true,
          profile: { create: { fullName: row.name, studentId: row.studentId } },
          privacy: { create: {} },
        },
      });
      out.push({ ...row, created: true });
    } catch (error) {
      const code = (error as { code?: unknown }).code;
      if (code !== "P2002") throw error;
      out.push({ ...row, valid: false, issues: ["conflict"], created: false });
    }
    done += 1;
    onProgress?.(done, valid.length);
  }
  const created = out.filter((r) => r.created).length;
  return { total: results.length, created, skipped: results.length - created, results: out };
}
