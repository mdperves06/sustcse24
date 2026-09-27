import "server-only";
import { unstable_rethrow } from "next/navigation";
import { ZodError, z } from "zod";
import { AppError, GENERIC_ERROR } from "@/lib/errors";
import { Prisma } from "@/lib/generated/prisma/client";
import type { ActionResult } from "@/types/action";

export type { ActionResult };

function fieldErrorsFromZod(error: ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}

/** Maps any thrown error to a user-safe result. Raw errors are logged, never returned. */
export function toActionError(error: unknown): ActionResult<never> {
  if (error instanceof ZodError) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrorsFromZod(error) };
  }
  if (error instanceof AppError) {
    return { ok: false, error: error.message, fieldErrors: error.fieldErrors };
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return { ok: false, error: "That already exists." };
    if (error.code === "P2025") return { ok: false, error: "That item no longer exists." };
  }
  console.error("[action] unexpected error", error);
  return { ok: false, error: GENERIC_ERROR };
}

/**
 * Wraps a server action body. Next.js control-flow errors (redirect/notFound)
 * are rethrown so they keep working.
 */
export async function runAction<T>(
  fn: () => Promise<T>,
  successMessage?: string,
): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data, message: successMessage };
  } catch (error) {
    unstable_rethrow(error);
    return toActionError(error);
  }
}
