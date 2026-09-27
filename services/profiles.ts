import "server-only";
import { db } from "@/lib/db";
import { canSee, DEFAULT_PRIVACY, type PrivacyFlags, type Viewer } from "@/lib/privacy";
import { privacySchema, profileSchema } from "@/lib/validation/profile";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { deleteUpload, saveUpload } from "@/lib/uploads";
import { skillSlug } from "@/lib/skills";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { BloodGroup, EmploymentStatus, Role, SkillCategory } from "@/lib/generated/prisma/enums";

const SKILL_FIELDS = {
  programmingLanguages: "LANGUAGE",
  frameworks: "FRAMEWORK",
  tools: "TOOL",
  otherSkills: "OTHER",
} as const satisfies Record<string, SkillCategory>;

export type ProfileLink = { label: string; url: string };

/** Everything another batch member may see — hidden fields are `null`, never present. */
export type ProfileView = {
  userId: string;
  roll: string;
  role: Role;
  isOwner: boolean;
  isVerified: boolean;
  fullName: string;
  nickname: string | null;
  studentId: string | null;
  avatarKey: string | null;
  bio: string | null;
  department: string;
  batch: string;
  interests: string[];
  academicInterests: string[];
  skills: Record<SkillCategory, string[]>;
  portfolioUrl: string | null;
  otherLinks: ProfileLink[];
  employmentStatus: EmploymentStatus;
  careerInterests: string[];
  hobbies: string[];
  certifications: string[];
  joinedAt: Date;
  // privacy-controlled
  email: string | null;
  phone: string | null;
  location: string | null;
  birthday: { month: number; day: number } | null;
  bloodGroup: BloodGroup | null;
  facebookUrl: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  currentOrganization: string | null;
  position: string | null;
  industry: string | null;
  hasCv: boolean;
  cvKey: string | null;
};

const profileSelect = {
  id: true,
  roll: true,
  role: true,
  email: true,
  createdAt: true,
  profile: true,
  privacy: true,
  skills: { select: { skill: { select: { name: true, category: true } } } },
} satisfies Prisma.UserSelect;

type ProfileRow = Prisma.UserGetPayload<{ select: typeof profileSelect }>;

function groupSkills(rows: ProfileRow["skills"]): Record<SkillCategory, string[]> {
  const out: Record<SkillCategory, string[]> = { LANGUAGE: [], FRAMEWORK: [], TOOL: [], OTHER: [] };
  for (const { skill } of rows) out[skill.category].push(skill.name);
  for (const k of Object.keys(out) as SkillCategory[]) out[k].sort((a, b) => a.localeCompare(b));
  return out;
}

function toView(row: ProfileRow, viewer: Viewer): ProfileView {
  const p = row.profile;
  if (!p) throw new NotFoundError("This student hasn't set up a profile yet.");
  const privacy: PrivacyFlags = row.privacy ?? DEFAULT_PRIVACY;
  const see = (field: keyof PrivacyFlags) => canSee(privacy[field], viewer, row.id);
  const showCareer = see("careerVisibility");

  return {
    userId: row.id,
    roll: row.roll,
    role: row.role,
    isOwner: viewer.id === row.id,
    isVerified: p.isVerified,
    fullName: p.fullName,
    nickname: p.nickname,
    studentId: p.studentId,
    avatarKey: p.avatarKey,
    bio: p.bio,
    department: p.department,
    batch: p.batch,
    interests: p.interests,
    academicInterests: p.academicInterests,
    skills: groupSkills(row.skills),
    portfolioUrl: p.portfolioUrl,
    otherLinks: Array.isArray(p.otherLinks) ? (p.otherLinks as ProfileLink[]) : [],
    employmentStatus: p.employmentStatus,
    careerInterests: p.careerInterests,
    hobbies: p.hobbies,
    certifications: p.certifications,
    joinedAt: row.createdAt,
    email: see("emailVisibility") ? row.email : null,
    phone: see("phoneVisibility") ? p.phone : null,
    location: see("locationVisibility") ? p.location : null,
    birthday:
      see("birthdayVisibility") && p.dateOfBirth
        ? { month: p.dateOfBirth.getUTCMonth() + 1, day: p.dateOfBirth.getUTCDate() }
        : null,
    bloodGroup: see("bloodGroupVisibility") ? p.bloodGroup : null,
    facebookUrl: see("facebookVisibility") ? p.facebookUrl : null,
    linkedinUrl: see("linkedinVisibility") ? p.linkedinUrl : null,
    githubUrl: see("githubVisibility") ? p.githubUrl : null,
    currentOrganization: showCareer ? p.currentOrganization : null,
    position: showCareer ? p.position : null,
    industry: showCareer ? p.industry : null,
    hasCv: Boolean(p.cvKey) && see("cvVisibility"),
    cvKey: see("cvVisibility") ? p.cvKey : null,
  };
}

const activeUser = { deletedAt: null, status: "ACTIVE" } satisfies Prisma.UserWhereInput;

export async function getProfileByRoll(viewer: Viewer, roll: string): Promise<ProfileView> {
  const row = await db.user.findFirst({ where: { roll, ...activeUser }, select: profileSelect });
  if (!row) throw new NotFoundError("No batch member with that roll.");
  return toView(row, viewer);
}

export async function getProfileById(viewer: Viewer, userId: string): Promise<ProfileView> {
  const row = await db.user.findFirst({ where: { id: userId, ...activeUser }, select: profileSelect });
  if (!row) throw new NotFoundError("No batch member found.");
  return toView(row, viewer);
}

/** Looks a member up by user id or roll (used by the REST API). */
export async function getProfileByIdOrRoll(viewer: Viewer, idOrRoll: string): Promise<ProfileView> {
  const row = await db.user.findFirst({
    where: { OR: [{ id: idOrRoll }, { roll: idOrRoll }], ...activeUser },
    select: profileSelect,
  });
  if (!row) throw new NotFoundError("No batch member found.");
  return toView(row, viewer);
}

/** The owner's own, unfiltered profile for the edit form. */
export async function getOwnProfile(userId: string) {
  const row = await db.user.findUniqueOrThrow({ where: { id: userId }, select: profileSelect });
  return {
    user: { id: row.id, roll: row.roll, email: row.email },
    profile: row.profile,
    privacy: row.privacy ?? DEFAULT_PRIVACY,
    skills: groupSkills(row.skills),
  };
}

async function syncSkills(tx: Prisma.TransactionClient, userId: string, byCategory: Record<SkillCategory, string[]>) {
  const wanted = new Map<string, { name: string; category: SkillCategory }>();
  for (const [category, names] of Object.entries(byCategory) as [SkillCategory, string[]][]) {
    for (const name of names) {
      const slug = skillSlug(name);
      if (slug && !wanted.has(slug)) wanted.set(slug, { name, category });
    }
  }
  const skillIds: string[] = [];
  for (const [slug, { name, category }] of wanted) {
    const skill = await tx.skill.upsert({
      where: { slug },
      update: {},
      create: { slug, name, category },
      select: { id: true },
    });
    skillIds.push(skill.id);
  }
  await tx.profileSkill.deleteMany({ where: { userId, skillId: { notIn: skillIds } } });
  await tx.profileSkill.createMany({
    data: skillIds.map((skillId) => ({ userId, skillId })),
    skipDuplicates: true,
  });
}

/** Students can only ever edit their own profile — the id comes from the session, not the request. */
export async function updateOwnProfile(actor: Viewer, input: unknown) {
  const data = profileSchema.parse(input);

  if (data.email) {
    const taken = await db.user.findFirst({
      where: { email: data.email, id: { not: actor.id } },
      select: { id: true },
    });
    if (taken) throw new ConflictError("That email is already used by another account.");
  }

  const profileData = {
    fullName: data.fullName,
    nickname: data.nickname,
    phone: data.phone,
    bloodGroup: data.bloodGroup,
    location: data.location,
    bio: data.bio,
    dateOfBirth: data.dateOfBirth,
    interests: data.interests,
    academicInterests: data.academicInterests,
    facebookUrl: data.facebookUrl,
    linkedinUrl: data.linkedinUrl,
    githubUrl: data.githubUrl,
    portfolioUrl: data.portfolioUrl,
    otherLinks: data.otherLinks,
    currentOrganization: data.currentOrganization,
    position: data.position,
    industry: data.industry,
    employmentStatus: data.employmentStatus,
    careerInterests: data.careerInterests,
    hobbies: data.hobbies,
    certifications: data.certifications,
  };

  await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: actor.id }, data: { email: data.email } });
    await tx.studentProfile.upsert({
      where: { userId: actor.id },
      update: profileData,
      create: { userId: actor.id, ...profileData },
    });
    await syncSkills(tx, actor.id, {
      LANGUAGE: data.programmingLanguages,
      FRAMEWORK: data.frameworks,
      TOOL: data.tools,
      OTHER: data.otherSkills,
    });
  });
}

export async function updateOwnPrivacy(actor: Viewer, input: unknown) {
  const data = privacySchema.parse(input);
  await db.privacySettings.upsert({
    where: { userId: actor.id },
    update: data,
    create: { userId: actor.id, ...data },
  });
}

export async function setOwnAvatar(actor: Viewer, file: File) {
  const saved = await saveUpload(file, "avatar", "avatar");
  const prev = await db.studentProfile.findUnique({ where: { userId: actor.id }, select: { avatarKey: true } });
  await db.studentProfile.update({ where: { userId: actor.id }, data: { avatarKey: saved.key } });
  await deleteUpload(prev?.avatarKey);
  return saved.key;
}

export async function removeOwnAvatar(actor: Viewer) {
  const prev = await db.studentProfile.findUnique({ where: { userId: actor.id }, select: { avatarKey: true } });
  await db.studentProfile.update({ where: { userId: actor.id }, data: { avatarKey: null } });
  await deleteUpload(prev?.avatarKey);
}

export async function setOwnCv(actor: Viewer, file: File) {
  const saved = await saveUpload(file, "cv", "cv");
  const prev = await db.studentProfile.findUnique({ where: { userId: actor.id }, select: { cvKey: true } });
  await db.studentProfile.update({
    where: { userId: actor.id },
    data: { cvKey: saved.key, cvFileName: saved.fileName },
  });
  await deleteUpload(prev?.cvKey);
}

export async function removeOwnCv(actor: Viewer) {
  const prev = await db.studentProfile.findUnique({ where: { userId: actor.id }, select: { cvKey: true } });
  await db.studentProfile.update({ where: { userId: actor.id }, data: { cvKey: null, cvFileName: null } });
  await deleteUpload(prev?.cvKey);
}

/** Weighted profile completeness (0–100). */
export function computeCompletion(
  profile: {
    avatarKey?: string | null;
    bio?: string | null;
    location?: string | null;
    dateOfBirth?: Date | null;
    phone?: string | null;
    bloodGroup?: string | null;
    interests?: string[];
    githubUrl?: string | null;
    linkedinUrl?: string | null;
    currentOrganization?: string | null;
    cvKey?: string | null;
    nickname?: string | null;
  } | null,
  email: string | null,
  skillCount: number,
): number {
  if (!profile) return 0;
  const checks: [boolean, number][] = [
    [Boolean(profile.avatarKey), 15],
    [Boolean(profile.bio), 10],
    [skillCount >= 3, 15],
    [Boolean(email), 8],
    [Boolean(profile.location), 7],
    [Boolean(profile.dateOfBirth), 7],
    [Boolean(profile.phone), 5],
    [Boolean(profile.bloodGroup), 5],
    [(profile.interests?.length ?? 0) > 0, 8],
    [Boolean(profile.githubUrl || profile.linkedinUrl), 10],
    [Boolean(profile.currentOrganization) || Boolean(profile.cvKey), 5],
    [Boolean(profile.nickname), 5],
  ];
  return Math.min(100, checks.reduce((sum, [ok, w]) => sum + (ok ? w : 0), 0));
}

export async function getOwnCompletion(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { email: true, profile: true, _count: { select: { skills: true } } },
  });
  return computeCompletion(user.profile, user.email, user._count.skills);
}

/** Public-to-batch activity shown on a profile: verified achievements and projects. */
export async function getProfileActivity(userId: string) {
  const [achievements, projects] = await Promise.all([
    db.achievement.findMany({
      where: { userId, status: "VERIFIED", deletedAt: null },
      orderBy: { achievedOn: "desc" },
      take: 10,
      select: { id: true, title: true, category: true, achievedOn: true, link: true },
    }),
    db.project.findMany({
      where: { deletedAt: null, OR: [{ authorId: userId }, { members: { some: { userId } } }] },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, title: true, category: true, technologies: true, _count: { select: { likes: true } } },
    }),
  ]);
  return { achievements, projects };
}
