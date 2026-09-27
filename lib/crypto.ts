import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** 256-bit random token, URL-safe. */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Tokens are stored hashed so a database leak cannot be replayed as sessions. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
