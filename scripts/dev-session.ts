/**
 * DEVELOPMENT ONLY — mint a session cookie for a *demo* account so pages can be
 * smoke-tested with curl. Refuses to run in production and refuses real accounts.
 *
 *   npx tsx scripts/dev-session.ts D24000
 *   curl -b "cse24_session=<token>" http://localhost:3000/dashboard
 */
import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

if (process.env.NODE_ENV === "production") {
  console.error("dev-session is disabled in production.");
  process.exit(1);
}

const roll = process.argv[2];
if (!roll) {
  console.error("Usage: npx tsx scripts/dev-session.ts <demo-roll>");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

async function main() {
const user = await db.user.findUnique({ where: { roll } });
if (!user || !user.isDemo) {
  console.error("Only seeded demo accounts (isDemo = true) can be used.");
  process.exit(1);
}
// Demo accounts start on the default password; clear the flag so pages are reachable.
await db.user.update({ where: { id: user.id }, data: { mustChangePassword: false } });
const token = randomBytes(32).toString("base64url");
await db.session.create({
  data: {
    tokenHash: createHash("sha256").update(token).digest("hex"),
    userId: user.id,
    expiresAt: new Date(Date.now() + 12 * 3600_000),
    userAgent: "dev-session script",
  },
});
console.log(`cse24_session=${token}`);
}

main().finally(() => db.$disconnect());
