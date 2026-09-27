import { NextResponse, type NextRequest } from "next/server";
import { isSameOrigin, jsonError, readJson, toErrorResponse } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth/current-user";
import { changePassword } from "@/services/auth";

/**
 * POST /api/auth/change-password — { currentPassword, newPassword, confirmPassword }.
 * The only authenticated endpoint available to users who still have the default password.
 */
export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) return jsonError(403, "Cross-site request blocked.");
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Please sign in to continue.");
    await changePassword(user.id, user.sessionId, await readJson(req));
    return NextResponse.json({ data: { changed: true } });
  } catch (error) {
    return toErrorResponse(error);
  }
}
