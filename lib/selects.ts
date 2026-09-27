import type { Prisma } from "@/lib/generated/prisma/client";
import type { Role } from "@/lib/generated/prisma/enums";

/** Minimal, always-public-to-batch identity of a user (name, roll, avatar). */
export const authorSelect = {
  id: true,
  roll: true,
  role: true,
  profile: { select: { fullName: true, avatarKey: true } },
} satisfies Prisma.UserSelect;

export type AuthorRow = Prisma.UserGetPayload<{ select: typeof authorSelect }>;

export type Author = { id: string; roll: string; role: Role; name: string; avatarKey: string | null };

export function toAuthor(u: AuthorRow): Author {
  return { id: u.id, roll: u.roll, role: u.role, name: u.profile?.fullName ?? u.roll, avatarKey: u.profile?.avatarKey ?? null };
}

/** Only active, non-deleted accounts. */
export const activeUserWhere = { deletedAt: null, status: "ACTIVE" } satisfies Prisma.UserWhereInput;
