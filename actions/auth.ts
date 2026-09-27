"use server";

import { redirect } from "next/navigation";
import { runAction, type ActionResult } from "@/lib/action";
import { formToObject } from "@/lib/forms";
import { getClientIp, getUserAgent } from "@/lib/request-context";
import { clearSessionCookie, readSessionCookie, setSessionCookie } from "@/lib/auth/cookies";
import { revokeSessionToken } from "@/lib/auth/session";
import { getActor } from "@/lib/auth/current-user";
import { AppError } from "@/lib/errors";
import { revalidatePath } from "next/cache";
import * as auth from "@/services/auth";

async function client() {
  return { ip: await getClientIp(), userAgent: await getUserAgent() };
}

/** Only allow same-site relative redirects after login (prevents open redirects). */
function safeNext(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/dashboard";
  }
  return next;
}

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const input = formToObject(formData);
  const result = await runAction(async () => {
    const session = await auth.login(input, await client());
    await setSessionCookie(session.token, { rememberMe: session.rememberMe, expiresAt: session.expiresAt });
    return { mustChangePassword: session.mustChangePassword };
  });
  if (!result.ok) return result;
  redirect(result.data?.mustChangePassword ? "/change-password" : safeNext(input.next));
}

export async function logoutAction() {
  const token = await readSessionCookie();
  if (token) await revokeSessionToken(token);
  await clearSessionCookie();
  redirect("/login?signedOut=1");
}

export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const actor = await getActor({ allowPasswordChange: true });
    await auth.changePassword(actor.id, actor.sessionId, formToObject(formData));
    return { wasForced: actor.mustChangePassword };
  }, "Password updated. Other devices have been signed out.");
  if (result.ok && result.data?.wasForced) redirect("/dashboard?welcome=1");
  return result;
}

export async function forgotPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  return runAction(async () => {
    await auth.requestPasswordReset(formToObject(formData), await client());
  }, "If an account matches, we've emailed a reset link. It expires in 30 minutes.");
}

export async function resetPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    await auth.resetPassword(formToObject(formData), await client());
  });
  if (result.ok) redirect("/login?reset=1");
  return result;
}

export async function revokeSessionAction(sessionId: string): Promise<ActionResult> {
  return runAction(async () => {
    const actor = await getActor();
    if (sessionId === actor.sessionId) throw new AppError("Use “Sign out” to end your current session.");
    await auth.revokeSession(actor.id, sessionId);
    revalidatePath("/settings");
  }, "Session signed out.");
}
