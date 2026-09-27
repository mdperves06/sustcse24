import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ZodError, z } from "zod";
import { AppError, GENERIC_ERROR } from "@/lib/errors";
import { Prisma } from "@/lib/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { SessionUser } from "@/lib/auth/session";

type Handler<P> = (ctx: { req: NextRequest; params: P; actor: SessionUser }) => Promise<unknown>;

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * CSRF protection for cookie-authenticated JSON APIs: state-changing requests must
 * come from our own origin (browsers always send Origin on cross-site POSTs).
 */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") !== "cross-site";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function jsonError(status: number, error: string, fieldErrors?: Record<string, string[] | undefined>) {
  return NextResponse.json({ error, ...(fieldErrors ? { fieldErrors } : {}) }, { status });
}

export function toErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return jsonError(422, "Please check the highlighted fields.", z.flattenError(error).fieldErrors as Record<string, string[]>);
  }
  if (error instanceof AppError) return jsonError(error.status, error.message, error.fieldErrors);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return jsonError(409, "That already exists.");
    if (error.code === "P2025") return jsonError(404, "Not found.");
  }
  console.error("[api] unexpected error", error);
  return jsonError(500, GENERIC_ERROR);
}

/**
 * Wraps a route handler with: session authentication, forced-password-change
 * enforcement, same-origin checks for mutations, and user-safe error responses.
 */
export function apiRoute<P = Record<string, string>>(handler: Handler<P>) {
  return async (req: NextRequest, context: { params: Promise<P> }) => {
    try {
      if (MUTATING.has(req.method) && !isSameOrigin(req)) return jsonError(403, "Cross-site request blocked.");
      const actor = await getCurrentUser();
      if (!actor) return jsonError(401, "Please sign in to continue.");
      if (actor.mustChangePassword) return jsonError(403, "Please change your default password first.");
      const result = await handler({ req, params: await context.params, actor });
      if (result instanceof Response) return result;
      return NextResponse.json({ data: result ?? null });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export async function readJson(req: NextRequest): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError("Request body must be valid JSON.", 400);
  }
}

export function searchParamsObject(req: NextRequest): Record<string, string> {
  return Object.fromEntries(req.nextUrl.searchParams.entries());
}

/** For unauthenticated endpoints (login, password reset): same-origin + safe errors only. */
export function publicApiRoute(handler: (req: NextRequest) => Promise<unknown>) {
  return async (req: NextRequest) => {
    try {
      if (MUTATING.has(req.method) && !isSameOrigin(req)) return jsonError(403, "Cross-site request blocked.");
      const result = await handler(req);
      if (result instanceof Response) return result;
      return NextResponse.json({ data: result ?? null });
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
