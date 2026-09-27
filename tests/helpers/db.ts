import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import type { Role } from "@/lib/generated/prisma/enums";

/** Wipes every table (test database only). */
export async function resetDatabase() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
}

let counter = 0;

export async function createUser(opts: { roll?: string; role?: Role; password?: string; mustChangePassword?: boolean; name?: string; email?: string } = {}) {
  counter += 1;
  const roll = opts.roll ?? `T${String(240000 + counter)}`;
  const user = await db.user.create({
    data: {
      roll,
      email: opts.email ?? `${roll.toLowerCase()}@test.example`,
      passwordHash: await hashPassword(opts.password ?? roll),
      role: opts.role ?? "STUDENT",
      mustChangePassword: opts.mustChangePassword ?? false,
      profile: { create: { fullName: opts.name ?? `Test ${roll}` } },
      privacy: { create: {} },
    },
  });
  return user;
}

export async function sessionFor(userId: string) {
  const { token } = await createSession(userId, { rememberMe: false });
  return token;
}

export const viewerOf = (u: { id: string; role: Role }) => ({ id: u.id, role: u.role });
