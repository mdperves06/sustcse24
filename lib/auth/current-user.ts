import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "./constants";
import { validateSessionToken, type SessionUser } from "./session";
import { can, type Permission } from "./permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

/** Resolves the signed-in user once per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return validateSessionToken(token);
});

/**
 * For pages: redirects anonymous users to login and users on the default
 * password to the mandatory change-password screen.
 */
export async function requireUser(opts: { allowPasswordChange?: boolean } = {}): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    const path = (await headers()).get("x-pathname") ?? "/dashboard";
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  if (user.mustChangePassword && !opts.allowPasswordChange) redirect("/change-password");
  return user;
}

/** For pages: renders a 403 redirect when the user lacks a permission. */
export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect("/dashboard?denied=1");
  return user;
}

/**
 * For server actions and API handlers: throws typed errors instead of redirecting.
 * Users who still have the default password can't use anything except password change.
 */
export async function getActor(opts: { allowPasswordChange?: boolean } = {}): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  if (user.mustChangePassword && !opts.allowPasswordChange) {
    throw new ForbiddenError("Please change your default password first.");
  }
  return user;
}

