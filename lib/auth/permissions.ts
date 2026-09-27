import type { Role } from "@/lib/generated/prisma/enums";
import { ForbiddenError } from "@/lib/errors";

/**
 * Central role → permission map. UI hides controls using `can()`, but every
 * service re-checks the same permission on the server — the UI is never trusted.
 */
const PERMISSIONS = {
  "admin.access": ["MODERATOR", "ADMIN"],
  "stats.view": ["ADMIN"],
  "students.manage": ["ADMIN"],
  "students.import": ["ADMIN"],
  "roles.assign": ["ADMIN"],
  "announcements.manage": ["ADMIN"],
  "events.manage": ["ADMIN"],
  "calendar.manage": ["ADMIN", "MODERATOR"],
  "polls.create": ["ADMIN", "MODERATOR"],
  "resources.manage": ["ADMIN"],
  "opportunities.manage": ["ADMIN"],
  "groups.manage": ["ADMIN", "MODERATOR"],
  "content.moderate": ["ADMIN", "MODERATOR"],
  "reports.review": ["ADMIN", "MODERATOR"],
  "users.restrict": ["ADMIN", "MODERATOR"],
  "achievements.verify": ["ADMIN", "MODERATOR"],
  "projects.manage": ["ADMIN", "MODERATOR"],
  "settings.manage": ["ADMIN"],
  "audit.view": ["ADMIN"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

export const isStaff = (role: Role | null | undefined) => role === "ADMIN" || role === "MODERATOR";

/** Server-side guard used by every service. */
export function assertCan(actor: { role: Role }, permission: Permission): void {
  if (!can(actor.role, permission)) throw new ForbiddenError();
}
