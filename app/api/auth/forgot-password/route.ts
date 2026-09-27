import { publicApiRoute, readJson } from "@/lib/api";
import { getClientIp, getUserAgent } from "@/lib/request-context";
import { requestPasswordReset } from "@/services/auth";

/** POST /api/auth/forgot-password — { identifier }. Always returns the same response. */
export const POST = publicApiRoute(async (req) => {
  await requestPasswordReset(await readJson(req), { ip: await getClientIp(), userAgent: await getUserAgent() });
  return { message: "If an account matches, a reset link has been emailed." };
});
