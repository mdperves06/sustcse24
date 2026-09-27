/**
 * PRODUCTION SETUP — create the first admin account (or promote an existing account to admin).
 *
 *   npx tsx scripts/create-admin.ts --roll 240001 --name "Full Name" [--email admin@example.com]
 *   npm run admin:create -- --roll 240001 --name "Full Name"
 *
 * - New accounts get password = roll and must change it at first sign-in (so the admin chooses
 *   their own password). No password is ever printed.
 * - An existing active account is only promoted to ADMIN; nothing else about it is changed.
 * - Disabled or deleted accounts are refused (restore them from the admin panel instead).
 *
 * Uses its own Prisma client and no `server-only` modules, so it runs with plain tsx.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { rollSchema } from "../lib/validation/auth";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  return v && !v.startsWith("--") ? v : undefined;
}

function fail(message: string): never {
  console.error(`✖ ${message}`);
  process.exit(1);
}

const input = z
  .object({
    roll: rollSchema,
    name: z.string().trim().min(1, "--name is required.").max(100, "Name is too long."),
    email: z
      .email("Invalid --email.")
      .max(200)
      .optional()
      .transform((v) => v?.toLowerCase()),
  })
  .safeParse({ roll: arg("roll"), name: arg("name"), email: arg("email") });

if (!input.success) {
  const issues = input.error.issues.map((i) => `  ${i.path.join(".") || "input"}: ${i.message}`).join("\n");
  console.error('Usage: npx tsx scripts/create-admin.ts --roll <roll> --name "Full Name" [--email x@y]\n' + issues);
  process.exit(1);
}

if (!process.env.DATABASE_URL) fail("DATABASE_URL is not set.");
const ROUNDS = Math.max(4, Number(process.env.BCRYPT_ROUNDS ?? 12));
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const { roll, name, email } = input.data!;
  const existing = await db.user.findFirst({
    where: { roll: { equals: roll, mode: "insensitive" } },
    select: { id: true, roll: true, role: true, status: true, deletedAt: true },
  });

  if (existing) {
    if (existing.deletedAt) fail(`Account ${existing.roll} is deleted. Restore it from the admin panel first.`);
    if (existing.status !== "ACTIVE") fail(`Account ${existing.roll} is disabled. Enable it from the admin panel first.`);
    if (existing.role === "ADMIN") {
      console.log(`✔ ${existing.roll} is already an admin. Nothing changed.`);
      return;
    }
    await db.user.update({ where: { id: existing.id }, data: { role: "ADMIN" } });
    await db.auditLog.create({
      data: { actorId: null, action: "cli.admin_promote", entityType: "User", entityId: existing.id, metadata: { roll: existing.roll, from: existing.role } },
    });
    console.log(`✔ Promoted ${existing.roll} from ${existing.role.toLowerCase()} to admin. Their password was not changed.`);
    return;
  }

  if (email) {
    const taken = await db.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } });
    if (taken) fail("That email is already used by another account.");
  }

  const user = await db.user.create({
    data: {
      roll,
      email: email ?? null,
      role: "ADMIN",
      passwordHash: await bcrypt.hash(roll, ROUNDS),
      mustChangePassword: true,
      profile: { create: { fullName: name } },
      privacy: { create: {} },
    },
    select: { id: true, roll: true },
  });
  await db.auditLog.create({
    data: { actorId: null, action: "cli.admin_create", entityType: "User", entityId: user.id, metadata: { roll: user.roll } },
  });
  console.log(`✔ Created admin ${user.roll}. Sign in with the roll number as the initial password; you'll be asked to choose a new one.`);
}

main()
  .catch((error: unknown) => {
    console.error("✖ Failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
