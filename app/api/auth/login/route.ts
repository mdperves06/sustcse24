import { publicApiRoute, readJson } from "@/lib/api";
import { setSessionCookie } from "@/lib/auth/cookies";
import { getClientIp, getUserAgent } from "@/lib/request-context";
import { login } from "@/services/auth";

/** POST /api/auth/login — { roll, password, remember? } → sets the session cookie. */
export const POST = publicApiRoute(async (req) => {
  const session = await login(await readJson(req), { ip: await getClientIp(), userAgent: await getUserAgent() });
  await setSessionCookie(session.token, { rememberMe: session.rememberMe, expiresAt: session.expiresAt });
  return { mustChangePassword: session.mustChangePassword };
});
