import "server-only";
import { headers } from "next/headers";

/** Best-effort client IP (behind a trusted proxy that sets x-forwarded-for). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

export async function getUserAgent(): Promise<string | null> {
  return (await headers()).get("user-agent");
}
