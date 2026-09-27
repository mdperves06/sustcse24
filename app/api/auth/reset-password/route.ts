import { publicApiRoute, readJson } from "@/lib/api";
import { getClientIp, getUserAgent } from "@/lib/request-context";
import { resetPassword } from "@/services/auth";

/** POST /api/auth/reset-password — { token, newPassword, confirmPassword }. */
export const POST = publicApiRoute(async (req) => {
  await resetPassword(await readJson(req), { ip: await getClientIp(), userAgent: await getUserAgent() });
  return { reset: true };
});
