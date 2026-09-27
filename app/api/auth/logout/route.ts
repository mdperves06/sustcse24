import { publicApiRoute } from "@/lib/api";
import { clearSessionCookie, readSessionCookie } from "@/lib/auth/cookies";
import { revokeSessionToken } from "@/lib/auth/session";

/** POST /api/auth/logout — revokes the current session. */
export const POST = publicApiRoute(async () => {
  const token = await readSessionCookie();
  if (token) await revokeSessionToken(token);
  await clearSessionCookie();
  return { signedOut: true };
});
