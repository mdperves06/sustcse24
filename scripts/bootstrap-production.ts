/**
 * PRODUCTION BOOTSTRAP — adds the real starter content defined in the spec
 * (default interest groups + default system settings). Contains NO demo accounts or fake posts.
 * Idempotent: safe to run more than once.
 *
 *   npx tsx scripts/bootstrap-production.ts --owner <admin-roll>
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

const GROUPS = [
  { slug: "ai-ml", name: "AI / ML", icon: "🤖", description: "Papers, projects and study sessions on machine learning and AI." },
  { slug: "web-dev", name: "Web Development", icon: "🌐", description: "Frontend, backend and everything in between." },
  { slug: "competitive-programming", name: "Competitive Programming", icon: "🏆", description: "Contest discussions, upsolving and practice partners." },
  { slug: "cyber-security", name: "Cyber Security", icon: "🛡️", description: "CTFs, security research and safe practices." },
  { slug: "robotics", name: "Robotics", icon: "🦾", description: "Hardware, ROS and robotics competitions." },
  { slug: "mun", name: "MUN", icon: "🌍", description: "Model United Nations preparation and conferences." },
  { slug: "research", name: "Research", icon: "🔬", description: "Find collaborators and share research opportunities." },
  { slug: "entrepreneurship", name: "Entrepreneurship", icon: "🚀", description: "Startups, ideas and founder talk." },
  { slug: "gaming", name: "Gaming", icon: "🎮", description: "Game nights and game development." },
  { slug: "photography", name: "Photography", icon: "📷", description: "Share your shots and plan photo walks." },
];

const SETTINGS: { key: string; value: boolean | string }[] = [
  { key: "aiAssistantEnabled", value: true },
  { key: "studentResourceUploads", value: true },
  { key: "studentOpportunityPosts", value: true },
];

async function main() {
  const i = process.argv.indexOf("--owner");
  const ownerRoll = i > -1 ? process.argv[i + 1] : undefined;
  if (!ownerRoll) throw new Error("Usage: npx tsx scripts/bootstrap-production.ts --owner <admin-roll>");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
  try {
    const owner = await db.user.findUnique({ where: { roll: ownerRoll }, select: { id: true, role: true } });
    if (!owner || owner.role !== "ADMIN") throw new Error(`No admin account with roll ${ownerRoll}.`);

    let created = 0;
    for (const g of GROUPS) {
      const existing = await db.group.findUnique({ where: { slug: g.slug } });
      if (existing) continue;
      await db.group.create({ data: { ...g, createdById: owner.id, members: { create: { userId: owner.id, role: "MANAGER" } } } });
      created += 1;
    }
    for (const s of SETTINGS) {
      await db.systemSetting.upsert({ where: { key: s.key }, update: {}, create: { key: s.key, value: s.value } });
    }
    console.log(`✔ ${created} interest group(s) created (${GROUPS.length - created} already existed); default settings ensured.`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
