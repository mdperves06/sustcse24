import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "./constants";
import { isProduction } from "@/lib/env";

/**
 * Session cookie: httpOnly (no JS access), SameSite=Lax (CSRF mitigation),
 * Secure in production. "Remember me" sessions persist; others end with the browser.
 */
export async function setSessionCookie(token: string, opts: { rememberMe: boolean; expiresAt: Date }) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    ...(opts.rememberMe ? { expires: opts.expiresAt } : {}),
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function readSessionCookie() {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}
