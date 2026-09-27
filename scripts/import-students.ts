/**
 * PRODUCTION SETUP — bulk-create student accounts from a CSV (same rules as Admin → Import).
 *
 *   npx tsx scripts/import-students.ts path/to/students.csv [--dry-run]
 *   npm run students:import -- path/to/students.csv --dry-run
 *
 * CSV header (case-insensitive, any order): roll,name[,student_id][,email]
 * Every created account gets password = roll and must change it at first sign-in.
 * Passwords are never printed. At most 500 rows per run.
 *
 * Uses its own Prisma client and no `server-only` modules, so it runs with plain tsx.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { createImportedStudents, describeIssues, findExistingKeys, parseStudentCsv, validateImportRows } from "../lib/csv";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const file = args.find((a) => !a.startsWith("--"));

if (!file) {
  console.error("Usage: npx tsx scripts/import-students.ts path/to/students.csv [--dry-run]");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("✖ DATABASE_URL is not set.");
  process.exit(1);
}

const ROUNDS = Math.max(4, Number(process.env.BCRYPT_ROUNDS ?? 12));
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const text = await readFile(file!, "utf8");
  const parsed = parseStudentCsv(text);
  if (!parsed.ok) {
    console.error(`✖ ${parsed.error}`);
    process.exitCode = 1;
    return;
  }

  const results = validateImportRows(parsed.rows, await findExistingKeys(db, parsed.rows));
  const invalid = results.filter((r) => !r.valid);
  const valid = results.length - invalid.length;

  console.log(`Rows: ${results.length} · valid: ${valid} · invalid: ${invalid.length}`);
  for (const r of invalid) console.log(`  line ${r.line} (${r.roll || "no roll"}): ${describeIssues(r.issues)}`);

  if (dryRun) {
    console.log("Dry run — nothing was written.");
    return;
  }
  if (valid === 0) {
    console.log("Nothing to import.");
    return;
  }

  const summary = await createImportedStudents(db, results, (plain) => bcrypt.hash(plain, ROUNDS), (done, total) => {
    if (done % 25 === 0 || done === total) process.stdout.write(`  created ${done}/${total}\r`);
  });
  process.stdout.write("\n");

  const conflicts = summary.results.filter((r) => r.valid === false && r.issues.includes("conflict"));
  for (const r of conflicts) console.log(`  line ${r.line} (${r.roll}): ${describeIssues(r.issues)}`);

  await db.auditLog.create({
    data: {
      actorId: null,
      action: "cli.students_import",
      entityType: "User",
      metadata: { total: summary.total, created: summary.created, skipped: summary.skipped },
    },
  });
  console.log(`✔ Created ${summary.created} account(s), skipped ${summary.skipped}. Initial password = roll; change forced at first sign-in.`);
}

main()
  .catch((error: unknown) => {
    console.error("✖ Import failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
