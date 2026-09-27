/**
 * DEVELOPMENT SEED — DEMO DATA ONLY.
 *
 * Every account created here is flagged `isDemo = true`, uses a roll starting with "D24"
 * and an @example.com email, and starts with the default password (= its roll) so the
 * mandatory password change flow can be exercised. Never run this against production.
 *
 *   npm run db:seed            # refuses to run if any real (non-demo) account exists
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import type { SkillCategory } from "../lib/generated/prisma/enums";
import { skillSlug } from "../lib/skills";

if (process.env.NODE_ENV === "production" && !process.argv.includes("--i-know-this-is-production")) {
  console.error("Refusing to seed demo data in production.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 10);

const DAY = 86_400_000;
const now = Date.now();
const days = (n: number) => new Date(now + n * DAY);
/** A birthday n days from today (UTC date, year 2003). */
const birthdayIn = (n: number) => {
  const d = new Date(now + n * DAY);
  return new Date(Date.UTC(2003, d.getUTCMonth(), d.getUTCDate()));
};

type DemoStudent = {
  name: string;
  nickname: string;
  location: string;
  bio: string;
  languages: string[];
  frameworks: string[];
  tools: string[];
  other?: string[];
  interests: string[];
  status?: "STUDENT" | "EMPLOYED" | "INTERN" | "FREELANCER" | "SEEKING" | "HIGHER_STUDIES" | "ENTREPRENEUR";
  org?: string;
  position?: string;
  industry?: string;
  blood: "A_POS" | "B_POS" | "O_POS" | "AB_POS" | "A_NEG" | "O_NEG" | "B_NEG";
  dob: Date;
};

const STUDENTS: DemoStudent[] = [
  { name: "Arif Hossain", nickname: "Arif", location: "Sylhet", bio: "Competitive programmer. Loves graphs and chai.", languages: ["C++", "Python"], frameworks: ["React"], tools: ["Git", "Linux"], interests: ["Competitive Programming", "Algorithms"], blood: "B_POS", dob: birthdayIn(0) },
  { name: "Nusrat Jahan", nickname: "Nusrat", location: "Dhaka", bio: "ML enthusiast working on Bangla NLP.", languages: ["Python"], frameworks: ["PyTorch", "FastAPI"], tools: ["Jupyter", "Git"], other: ["AI/ML", "Data Science"], interests: ["AI/ML", "Research"], status: "INTERN", org: "Pathao", position: "ML Intern", industry: "Software Engineering", blood: "O_POS", dob: birthdayIn(3) },
  { name: "Tanvir Rahman", nickname: "Tanvir", location: "Sylhet", bio: "Full-stack developer. Next.js all day.", languages: ["TypeScript", "JavaScript"], frameworks: ["Next.js", "React", "Node.js"], tools: ["Docker", "PostgreSQL"], interests: ["Web Development", "Open Source"], status: "EMPLOYED", org: "Brain Station 23", position: "Software Engineer", industry: "Software Engineering", blood: "A_POS", dob: birthdayIn(12) },
  { name: "Farhana Akter", nickname: "Farhana", location: "Chattogram", bio: "Security researcher and CTF player.", languages: ["Python", "C"], frameworks: [], tools: ["Burp Suite", "Wireshark", "Linux"], other: ["Cyber Security"], interests: ["Cyber Security", "CTF"], blood: "AB_POS", dob: birthdayIn(25) },
  { name: "Mahmudul Hasan", nickname: "Mahi", location: "Dhaka", bio: "Android dev, Kotlin fan.", languages: ["Kotlin", "Java"], frameworks: ["Jetpack Compose", "Flutter"], tools: ["Android Studio", "Firebase"], interests: ["Mobile Development"], status: "EMPLOYED", org: "Shohoz", position: "Android Engineer", industry: "Software Engineering", blood: "O_NEG", dob: birthdayIn(40) },
  { name: "Sadia Islam", nickname: "Sadia", location: "Sylhet", bio: "Data science + visualization. MUN delegate.", languages: ["Python", "R", "SQL"], frameworks: ["Pandas", "scikit-learn"], tools: ["Tableau", "Excel"], other: ["Data Science"], interests: ["Data Science", "MUN"], blood: "B_POS", dob: birthdayIn(60) },
  { name: "Rakibul Islam", nickname: "Rakib", location: "Rajshahi", bio: "Robotics club lead. Arduino tinkerer.", languages: ["C++", "Python"], frameworks: ["ROS"], tools: ["Arduino", "SolidWorks"], other: ["Robotics", "IoT"], interests: ["Robotics", "IoT"], blood: "A_POS", dob: birthdayIn(75) },
  { name: "Ayesha Siddiqua", nickname: "Ayesha", location: "Dhaka", bio: "UI/UX designer who codes.", languages: ["JavaScript", "TypeScript"], frameworks: ["React", "Tailwind CSS"], tools: ["Figma", "Git"], interests: ["Web Development", "Design"], status: "FREELANCER", org: "Freelance", position: "Product Designer", industry: "Design", blood: "O_POS", dob: birthdayIn(90) },
  { name: "Imran Chowdhury", nickname: "Imran", location: "Sylhet", bio: "Backend + distributed systems.", languages: ["Go", "Java", "Python"], frameworks: ["Spring Boot"], tools: ["Kubernetes", "Docker", "Redis"], interests: ["Cloud", "Distributed Systems"], status: "SEEKING", blood: "B_NEG", dob: birthdayIn(110) },
  { name: "Tasnim Ferdous", nickname: "Tasnim", location: "Khulna", bio: "Research on medical imaging with deep learning.", languages: ["Python", "MATLAB"], frameworks: ["TensorFlow", "PyTorch"], tools: ["Jupyter"], other: ["AI/ML"], interests: ["AI/ML", "Research"], status: "HIGHER_STUDIES", org: "KAIST", position: "MS Student", industry: "Research", blood: "A_NEG", dob: birthdayIn(130) },
  { name: "Shahriar Kabir", nickname: "Shahriar", location: "Dhaka", bio: "Building a startup in edtech.", languages: ["JavaScript", "Python"], frameworks: ["Next.js", "Django"], tools: ["AWS", "Figma"], other: ["Entrepreneurship"], interests: ["Entrepreneurship", "Web Development"], status: "ENTREPRENEUR", org: "PathShala Labs", position: "Co-founder", industry: "EdTech", blood: "O_POS", dob: birthdayIn(150) },
  { name: "Mim Akter", nickname: "Mim", location: "Sylhet", bio: "Photographer and front-end dev.", languages: ["JavaScript"], frameworks: ["Vue.js", "React"], tools: ["Lightroom", "Git"], interests: ["Photography", "Web Development"], blood: "AB_POS", dob: birthdayIn(170) },
  { name: "Fahim Ahmed", nickname: "Fahim", location: "Cumilla", bio: "Game dev with Unity. Gamer at heart.", languages: ["C#", "C++"], frameworks: ["Unity"], tools: ["Blender", "Git"], interests: ["Gaming", "Game Development"], blood: "B_POS", dob: birthdayIn(190) },
  { name: "Jannatul Ferdous", nickname: "Jannat", location: "Dhaka", bio: "Cloud and DevOps learner.", languages: ["Python", "Bash"], frameworks: [], tools: ["AWS", "Terraform", "Docker"], interests: ["Cloud", "DevOps"], status: "INTERN", org: "Therap BD", position: "DevOps Intern", industry: "Software Engineering", blood: "O_POS", dob: birthdayIn(210) },
  { name: "Nazmul Huda", nickname: "Nazmul", location: "Sylhet", bio: "ICPC regional finalist.", languages: ["C++", "Java"], frameworks: [], tools: ["Linux", "Vim"], interests: ["Competitive Programming"], blood: "A_POS", dob: birthdayIn(230) },
  { name: "Rumana Afroz", nickname: "Rumana", location: "Barishal", bio: "Interested in HCI and accessibility.", languages: ["JavaScript", "Python"], frameworks: ["React"], tools: ["Figma"], interests: ["HCI", "Research"], blood: "B_POS", dob: birthdayIn(250) },
  { name: "Sabbir Hossain", nickname: "Sabbir", location: "Dhaka", bio: "Blockchain and smart contracts.", languages: ["Solidity", "JavaScript", "Rust"], frameworks: ["Hardhat", "Node.js"], tools: ["Git"], interests: ["Blockchain", "Cyber Security"], blood: "O_NEG", dob: birthdayIn(270) },
  { name: "Lamia Chowdhury", nickname: "Lamia", location: "Sylhet", bio: "Debater, MUN secretary, aspiring PM.", languages: ["Python"], frameworks: [], tools: ["Notion", "Excel"], other: ["Public Speaking"], interests: ["MUN", "Entrepreneurship"], blood: "A_POS", dob: birthdayIn(290) },
  { name: "Towhid Islam", nickname: "Towhid", location: "Mymensingh", bio: "Embedded systems & IoT hobbyist.", languages: ["C", "Python"], frameworks: [], tools: ["Raspberry Pi", "Arduino"], other: ["IoT"], interests: ["IoT", "Robotics"], blood: "B_POS", dob: birthdayIn(310) },
  { name: "Priya Das", nickname: "Priya", location: "Sylhet", bio: "Data engineer in the making.", languages: ["SQL", "Python", "Scala"], frameworks: ["Apache Spark"], tools: ["Airflow", "PostgreSQL"], other: ["Data Science"], interests: ["Data Science", "Cloud"], blood: "O_POS", dob: birthdayIn(330) },
];

const GROUPS = [
  { slug: "ai-ml", name: "AI / ML", icon: "🤖", description: "Papers, projects and study sessions on machine learning." },
  { slug: "web-dev", name: "Web Development", icon: "🌐", description: "Frontend, backend and everything in between." },
  { slug: "competitive-programming", name: "Competitive Programming", icon: "🏆", description: "Contest discussions, upsolving and practice partners." },
  { slug: "cyber-security", name: "Cyber Security", icon: "🛡️", description: "CTFs, security research and safe practices." },
  { slug: "robotics", name: "Robotics", icon: "🦾", description: "Hardware, ROS and robotics competitions." },
  { slug: "mun", name: "MUN", icon: "🌍", description: "Model United Nations prep and conferences." },
  { slug: "research", name: "Research", icon: "🔬", description: "Find collaborators and share research opportunities." },
  { slug: "entrepreneurship", name: "Entrepreneurship", icon: "🚀", description: "Startups, ideas and founder talk." },
  { slug: "gaming", name: "Gaming", icon: "🎮", description: "Game nights and game development." },
  { slug: "photography", name: "Photography", icon: "📷", description: "Share shots and plan photo walks." },
];

async function main() {
  const realUsers = await db.user.count({ where: { isDemo: false } });
  if (realUsers > 0 && !process.argv.includes("--force")) {
    console.error(`Found ${realUsers} real (non-demo) account(s). Refusing to wipe the database. Pass --force to override.`);
    process.exit(1);
  }

  console.log("Clearing existing data…");
  const tables = await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await db.$executeRawUnsafe(`TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);

  console.log("Creating demo accounts…");
  const hash = (roll: string) => bcrypt.hash(roll, ROUNDS);

  const admin = await db.user.create({
    data: {
      roll: "D24000",
      email: "demo.admin@example.com",
      passwordHash: await hash("D24000"),
      role: "ADMIN",
      isDemo: true,
      profile: { create: { fullName: "Demo Admin", nickname: "Admin", bio: "[Demo] Batch administrator account.", studentId: "DEMO-000", isVerified: true } },
      privacy: { create: {} },
    },
  });
  const moderator = await db.user.create({
    data: {
      roll: "D24001",
      email: "demo.moderator@example.com",
      passwordHash: await hash("D24001"),
      role: "MODERATOR",
      isDemo: true,
      profile: { create: { fullName: "Demo Moderator", nickname: "Mod", bio: "[Demo] Community moderator / class representative.", studentId: "DEMO-001", isVerified: true } },
      privacy: { create: {} },
    },
  });

  const skillIds = new Map<string, string>();
  async function skill(name: string, category: SkillCategory) {
    const slug = skillSlug(name);
    if (!skillIds.has(slug)) {
      const s = await db.skill.upsert({ where: { slug }, update: {}, create: { slug, name, category } });
      skillIds.set(slug, s.id);
    }
    return skillIds.get(slug)!;
  }

  const students: { id: string; roll: string; name: string }[] = [];
  for (const [i, s] of STUDENTS.entries()) {
    const roll = `D24${String(i + 2).padStart(3, "0")}`;
    const first = s.nickname.toLowerCase();
    const user = await db.user.create({
      data: {
        roll,
        email: `${first}.demo@example.com`,
        passwordHash: await hash(roll),
        isDemo: true,
        profile: {
          create: {
            fullName: s.name,
            nickname: s.nickname,
            studentId: `DEMO-${String(i + 2).padStart(3, "0")}`,
            location: s.location,
            bio: s.bio,
            dateOfBirth: s.dob,
            bloodGroup: s.blood,
            phone: `+8801700000${String(i).padStart(3, "0")}`,
            interests: s.interests,
            academicInterests: s.interests.slice(0, 1),
            githubUrl: `https://github.com/example-${first}`,
            linkedinUrl: `https://www.linkedin.com/in/example-${first}`,
            employmentStatus: s.status ?? "STUDENT",
            currentOrganization: s.org ?? null,
            position: s.position ?? null,
            industry: s.industry ?? null,
            careerInterests: s.interests.slice(0, 2),
            hobbies: i % 2 ? ["Football", "Reading"] : ["Cricket", "Travel"],
            isVerified: i % 3 !== 0,
          },
        },
        // A mix of privacy choices so filtering can be verified.
        privacy: {
          create: {
            phoneVisibility: i % 4 === 0 ? "BATCH" : "PRIVATE",
            locationVisibility: i % 5 === 4 ? "PRIVATE" : "BATCH",
            careerVisibility: i % 6 === 5 ? "PRIVATE" : "BATCH",
            birthdayVisibility: i % 7 === 6 ? "PRIVATE" : "BATCH",
          },
        },
      },
    });
    const ids = [
      ...(await Promise.all(s.languages.map((n) => skill(n, "LANGUAGE")))),
      ...(await Promise.all(s.frameworks.map((n) => skill(n, "FRAMEWORK")))),
      ...(await Promise.all(s.tools.map((n) => skill(n, "TOOL")))),
      ...(await Promise.all((s.other ?? []).map((n) => skill(n, "OTHER")))),
    ];
    await db.profileSkill.createMany({ data: [...new Set(ids)].map((skillId) => ({ userId: user.id, skillId })), skipDuplicates: true });
    students.push({ id: user.id, roll, name: s.name });
  }
  const everyone = [admin.id, moderator.id, ...students.map((s) => s.id)];
  const pick = (i: number) => students[i % students.length]!;

  console.log("Creating groups…");
  const groups = [];
  for (const [i, g] of GROUPS.entries()) {
    const group = await db.group.create({ data: { ...g, createdById: admin.id } });
    const members = students.filter((_, j) => (j + i) % 3 === 0).map((s) => s.id);
    await db.groupMember.createMany({
      data: [{ groupId: group.id, userId: moderator.id, role: "MANAGER" as const }, ...members.map((userId) => ({ groupId: group.id, userId }))],
      skipDuplicates: true,
    });
    groups.push(group);
  }

  console.log("Creating announcements…");
  await db.announcement.createMany({
    data: [
      { title: "[Demo] Welcome to the CSE 24 Community platform", body: "This is the new home for our batch. Complete your profile, set your privacy preferences and say hi in the feed!", category: "IMPORTANT", priority: "HIGH", pinned: true, authorId: admin.id },
      { title: "[Demo] Term final routine published", body: "The routine for the upcoming term finals is available on the department notice board. Exam dates have been added to the batch calendar.", category: "ACADEMIC", priority: "HIGH", authorId: admin.id, expiresAt: days(30) },
      { title: "[Demo] Batch iftar registration open", body: "Register for the batch iftar from the Events page before the deadline.", category: "EVENT", priority: "NORMAL", authorId: admin.id },
      { title: "[Demo] Career talk: breaking into ML roles", body: "Alumni from local AI teams will share how they prepared for interviews. Join us in Gallery 2.", category: "CAREER", priority: "NORMAL", authorId: moderator.id },
      { title: "[Demo] Lab 3 schedule change", body: "Thursday's lab moves to Sunday 10am this week only.", category: "GENERAL", priority: "LOW", authorId: moderator.id },
    ],
  });

  console.log("Creating events…");
  const eventDefs = [
    { title: "[Demo] Batch Iftar 2026", type: "IFTAR" as const, startsAt: days(6), hours: 3, location: "University Central Field", organizer: "CSE 24 Batch Committee", description: "Our annual batch iftar. Bring your friends from the batch!" },
    { title: "[Demo] Intra-batch Hackathon", type: "HACKATHON" as const, startsAt: days(14), hours: 24, location: "CSE Building, Lab 1–3", organizer: "Programming Club", description: "24 hours, teams of up to 3. Theme revealed at kickoff." },
    { title: "[Demo] Football Friday", type: "SPORTS" as const, startsAt: days(2), hours: 2, location: "Central Field", organizer: "Sports Wing", description: "Friendly football match — everyone welcome." },
    { title: "[Demo] Workshop: Git & GitHub", type: "WORKSHOP" as const, startsAt: days(9), hours: 2, location: "Gallery 1", organizer: "Web Dev Group", description: "Hands-on workshop for branching, pull requests and code review." },
    { title: "[Demo] Tour to Ratargul", type: "TOUR" as const, startsAt: days(-20), hours: 10, location: "Ratargul Swamp Forest", organizer: "CSE 24 Batch Committee", description: "A day trip to Ratargul swamp forest." },
  ];
  const events = [];
  for (const e of eventDefs) {
    const { hours, ...rest } = e;
    const ev = await db.event.create({
      data: { ...rest, endsAt: new Date(e.startsAt.getTime() + hours * 3_600_000), registrationDeadline: new Date(e.startsAt.getTime() - DAY), createdById: admin.id },
    });
    events.push(ev);
  }
  for (const [i, ev] of events.entries()) {
    await db.eventAttendee.createMany({
      data: students.slice(0, 8 + i * 2).map((s, j) => ({ eventId: ev.id, userId: s.id, status: (j % 5 === 0 ? "MAYBE" : j % 7 === 0 ? "NOT_GOING" : "GOING") as "GOING" | "MAYBE" | "NOT_GOING" })),
    });
  }

  console.log("Creating calendar entries…");
  await db.calendarEvent.createMany({
    data: [
      { title: "[Demo] CSE 331 Midterm", type: "EXAM", course: "CSE 331", startsAt: days(5), location: "Room 301", createdById: moderator.id },
      { title: "[Demo] CSE 333 Assignment 2 due", type: "ASSIGNMENT", course: "CSE 333", startsAt: days(3), allDay: true, createdById: moderator.id },
      { title: "[Demo] Project proposal deadline", type: "DEADLINE", course: "CSE 300", startsAt: days(11), allDay: true, createdById: moderator.id },
      { title: "[Demo] National Collegiate Programming Contest", type: "COMPETITION", startsAt: days(20), location: "Dhaka", createdById: admin.id },
      { title: "[Demo] CSE 335 Quiz 3", type: "EXAM", course: "CSE 335", startsAt: days(8), location: "Gallery 2", createdById: moderator.id },
    ],
  });

  console.log("Creating posts…");
  const postDefs = [
    { type: "QUESTION" as const, content: "Does anyone have good resources for learning dynamic programming? Planning to practice before the hackathon." },
    { type: "ACHIEVEMENT" as const, content: "Our team placed 2nd at the regional hackathon this weekend! 🎉 Thanks everyone who helped us test." },
    { type: "DISCUSSION" as const, content: "What stack are you all using for the software engineering project? We're debating Next.js vs Django." },
    { type: "OPPORTUNITY" as const, content: "Pathao is hiring ML interns for summer. Check the Opportunities board for the link!" },
    { type: "GENERAL" as const, content: "Reminder: football this Friday. Bring water!" },
    { type: "PROJECT" as const, content: "Just open-sourced our Bangla OCR project — feedback welcome: https://github.com/example-nusrat/bangla-ocr" },
    { type: "QUESTION" as const, content: "Is the CSE 331 midterm syllabus up to chapter 5 or 6?" },
    { type: "DISCUSSION" as const, content: "Should we organize a weekly study group for the algorithms course?" },
  ];
  for (const [i, p] of postDefs.entries()) {
    const author = pick(i * 3);
    const post = await db.post.create({ data: { ...p, content: `${p.content}`, authorId: author.id, createdAt: new Date(now - (postDefs.length - i) * 3_600_000 * 5) } });
    await db.reaction.createMany({
      data: students.filter((_, j) => (j + i) % 3 === 0 && students[j]!.id !== author.id).map((s, j) => ({ postId: post.id, userId: s.id, type: (["LIKE", "LOVE", "CELEBRATE", "INSIGHTFUL"] as const)[j % 4]! })),
    });
    await db.comment.createMany({
      data: [
        { postId: post.id, authorId: pick(i * 3 + 1).id, content: "Great point! Count me in." },
        { postId: post.id, authorId: pick(i * 3 + 2).id, content: "Thanks for sharing 🙌" },
      ],
    });
  }
  await db.post.create({ data: { authorId: pick(4).id, groupId: groups[0]!.id, type: "DISCUSSION", content: "Paper reading this week: 'Attention Is All You Need'. Who's in?" } });
  await db.post.create({ data: { authorId: pick(2).id, groupId: groups[1]!.id, type: "QUESTION", content: "Server Components vs client fetching — what do you prefer for dashboards?" } });

  console.log("Creating polls…");
  const poll1 = await db.poll.create({
    data: {
      question: "[Demo] Where should we arrange the next batch meetup?",
      createdById: admin.id,
      endsAt: days(7),
      options: { create: ["Campus", "Dhaka", "Sylhet", "Other"].map((label, position) => ({ label, position })) },
    },
    include: { options: true },
  });
  for (const [j, s] of students.slice(0, 12).entries()) {
    await db.pollBallot.create({ data: { pollId: poll1.id, userId: s.id, votes: { create: [{ optionId: poll1.options[j % 3]!.id }] } } });
  }
  await db.poll.create({
    data: {
      question: "[Demo] Which workshops do you want next? (choose any)",
      multipleChoice: true,
      anonymous: true,
      createdById: moderator.id,
      endsAt: days(10),
      options: { create: ["Docker", "System Design", "Machine Learning Ops", "Technical Writing"].map((label, position) => ({ label, position })) },
    },
  });

  console.log("Creating resources…");
  await db.resource.createMany({
    data: [
      { title: "[Demo] CP-Algorithms", description: "Classic reference for competitive programming algorithms.", course: "CSE 201", category: "LINK", url: "https://cp-algorithms.com/", uploadedById: pick(0).id },
      { title: "[Demo] MIT OCW — Introduction to Algorithms", description: "Lecture videos and notes.", course: "CSE 201", category: "TUTORIAL", url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/", uploadedById: pick(14).id },
      { title: "[Demo] Operating Systems: Three Easy Pieces", description: "Free OS textbook.", course: "CSE 331", category: "NOTES", url: "https://pages.cs.wisc.edu/~remzi/OSTEP/", uploadedById: moderator.id },
      { title: "[Demo] Database lab guide", description: "SQL practice problems for the DB lab.", course: "CSE 333", category: "LAB", url: "https://www.postgresql.org/docs/current/tutorial.html", uploadedById: pick(19).id },
      { title: "[Demo] Networking slides (week 1–4)", description: "Link to the shared slides folder.", course: "CSE 335", category: "SLIDES", url: "https://example.com/demo-slides", uploadedById: moderator.id },
      { title: "[Demo] Full Stack Open", description: "Modern web development course.", course: "CSE 300", category: "COURSE", url: "https://fullstackopen.com/en/", uploadedById: pick(2).id },
    ],
  });

  console.log("Creating opportunities…");
  const opps = await db.opportunity.createManyAndReturn({
    data: [
      { title: "[Demo] Summer ML Internship", organization: "Pathao", type: "INTERNSHIP", location: "Dhaka (hybrid)", deadline: days(12), applyUrl: "https://example.com/apply/ml-intern", description: "3-month internship working on demand forecasting.", postedById: pick(1).id },
      { title: "[Demo] Junior Software Engineer", organization: "Brain Station 23", type: "JOB", location: "Dhaka", deadline: days(20), applyUrl: "https://example.com/apply/jse", description: "Full-time role for fresh graduates.", postedById: pick(2).id },
      { title: "[Demo] ICPC Asia Dhaka Regional", organization: "ICPC", type: "COMPETITION", location: "Dhaka", deadline: days(4), applyUrl: "https://icpc.global/", description: "Team registration for the regional contest.", postedById: moderator.id },
      { title: "[Demo] Erasmus Mundus Scholarship", organization: "European Commission", type: "SCHOLARSHIP", location: "Europe", deadline: days(45), applyUrl: "https://example.com/erasmus", description: "Fully funded master's programmes.", postedById: admin.id },
      { title: "[Demo] Research assistant — NLP lab", organization: "SUST NLP Lab", type: "RESEARCH", location: "On campus", deadline: days(9), applyUrl: "https://example.com/ra", description: "Part-time RA on Bangla language models.", postedById: pick(9).id },
      { title: "[Demo] Hackathon: Build for Bangladesh", organization: "Startup Dhaka", type: "HACKATHON", location: "Online", deadline: days(-3), applyUrl: "https://example.com/hack", description: "Expired example — shows automatic expiry.", postedById: pick(10).id },
    ],
  });
  await db.opportunityBookmark.createMany({ data: students.slice(0, 6).map((s) => ({ userId: s.id, opportunityId: opps[0]!.id })) });

  console.log("Creating achievements…");
  await db.achievement.createMany({
    data: [
      { userId: pick(0).id, title: "ICPC Dhaka Regional — Honorable Mention", category: "COMPETITION", achievedOn: days(-60), status: "VERIFIED", verifiedById: admin.id, verifiedAt: days(-55) },
      { userId: pick(1).id, title: "Paper accepted at BLP Workshop", category: "RESEARCH", description: "Bangla sentiment analysis with transformers.", achievedOn: days(-30), status: "VERIFIED", verifiedById: moderator.id, verifiedAt: days(-28), link: "https://example.com/paper" },
      { userId: pick(5).id, title: "Best Delegate — SUST MUN", category: "MUN", achievedOn: days(-90), status: "VERIFIED", verifiedById: moderator.id, verifiedAt: days(-85) },
      { userId: pick(2).id, title: "2nd place — Regional Hackathon", category: "HACKATHON", achievedOn: days(-2), status: "PENDING" },
      { userId: pick(9).id, title: "KAIST MS Scholarship", category: "SCHOLARSHIP", achievedOn: days(-120), status: "VERIFIED", verifiedById: admin.id, verifiedAt: days(-100) },
      { userId: pick(13).id, title: "AWS Certified Cloud Practitioner", category: "CERTIFICATION", achievedOn: days(-15), status: "PENDING" },
    ],
  });

  console.log("Creating projects…");
  const projectDefs = [
    { title: "Bangla OCR", category: "AI_ML" as const, technologies: ["Python", "PyTorch", "OpenCV"], author: 1, description: "Optical character recognition for printed Bangla text with a CRNN model." },
    { title: "Campus Bus Tracker", category: "MOBILE" as const, technologies: ["Kotlin", "Firebase", "Google Maps"], author: 4, description: "Real-time location of university buses with arrival estimates." },
    { title: "CTF Training Platform", category: "CYBER_SECURITY" as const, technologies: ["Python", "Docker", "Flask"], author: 3, description: "Self-hosted jeopardy CTF with auto-deployed challenge containers." },
    { title: "Smart Irrigation", category: "IOT" as const, technologies: ["Arduino", "C++", "MQTT"], author: 18, description: "Soil-moisture based irrigation controller with a web dashboard." },
    { title: "Batch Expense Splitter", category: "WEB" as const, technologies: ["Next.js", "TypeScript", "PostgreSQL"], author: 2, description: "Split tour and event costs across the batch transparently." },
    { title: "Line Follower Robot", category: "ROBOTICS" as const, technologies: ["C++", "Arduino"], author: 6, description: "PID-tuned line follower that won the intra-university contest." },
  ];
  for (const [i, p] of projectDefs.entries()) {
    const author = pick(p.author);
    const project = await db.project.create({
      data: {
        title: `[Demo] ${p.title}`,
        description: p.description,
        technologies: p.technologies,
        category: p.category,
        githubUrl: `https://github.com/example/${skillSlug(p.title)}`,
        demoUrl: i % 2 === 0 ? `https://example.com/${skillSlug(p.title)}` : null,
        authorId: author.id,
        members: { create: [{ userId: author.id, role: "Lead" }, { userId: pick(p.author + 5).id, role: "Developer" }] },
      },
    });
    await db.projectLike.createMany({ data: students.filter((_, j) => (j + i) % 2 === 0).map((s) => ({ projectId: project.id, userId: s.id })) });
  }

  console.log("Creating teammate requests…");
  await db.teammateRequest.createMany({
    data: [
      { authorId: pick(2).id, title: "[Demo] Hackathon team: AI-powered study planner", description: "Looking for an ML person and a designer for the intra-batch hackathon.", requiredSkills: ["python", "ai/ml", "figma"], teammatesNeeded: 2, deadline: days(10), contactPreference: "IN_APP" },
      { authorId: pick(3).id, title: "[Demo] CTF team for national contest", description: "Need 2 teammates comfortable with web exploitation or reversing.", requiredSkills: ["cyber security", "python", "linux"], teammatesNeeded: 2, deadline: days(15), contactPreference: "EMAIL" },
      { authorId: pick(6).id, title: "[Demo] Robotics competition build", description: "Mechanical + embedded help wanted.", requiredSkills: ["arduino", "c++", "robotics"], teammatesNeeded: 1, contactPreference: "PHONE" },
      { authorId: pick(10).id, title: "[Demo] Edtech MVP — React developer", description: "Part-time help building our MVP front-end.", requiredSkills: ["react", "next.js", "typescript"], teammatesNeeded: 1, deadline: days(30), contactPreference: "LINKEDIN" },
    ],
  });

  console.log("Creating notifications…");
  await db.notification.createMany({
    data: everyone.map((userId) => ({ userId, type: "ANNOUNCEMENT" as const, title: "Welcome to the CSE 24 Community platform", link: "/announcements" })),
  });

  await db.systemSetting.createMany({
    data: [
      { key: "aiAssistantEnabled", value: true },
      { key: "studentResourceUploads", value: true },
      { key: "siteNotice", value: "" },
    ],
  });

  console.log(`\nSeeded ${students.length + 2} demo accounts (rolls D24000–D24${String(students.length + 1).padStart(3, "0")}).`);
  console.log("Demo admin: roll D24000 · moderator: D24001 · students: D24002+.");
  console.log("Every demo account's initial password is its roll; you'll be asked to change it on first sign-in.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
