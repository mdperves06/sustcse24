import { z } from "zod";
import { parseDateOnly, parseLocalInput } from "@/lib/time";

/** Optional text: empty strings become undefined/null. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use at most ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : null));

export const requiredText = (max: number, label = "This field") =>
  z.string().trim().min(1, `${label} is required.`).max(max, `Use at most ${max} characters.`);

/** http(s) URLs only — blocks javascript: and data: URLs. */
export const safeUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a valid http(s) link.");

export const optionalUrl = z
  .union([z.literal(""), safeUrl])
  .optional()
  .transform((v) => (v ? v : null));

/** Accepts either an array or a comma-separated string; trims, de-duplicates, caps length. */
export const tagList = (maxItems = 20, maxLen = 40) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      const raw = Array.isArray(v) ? v : (v ?? "").split(",");
      const seen = new Set<string>();
      const out: string[] = [];
      for (const item of raw) {
        const t = item.trim().slice(0, maxLen);
        const k = t.toLowerCase();
        if (t && !seen.has(k)) {
          seen.add(k);
          out.push(t);
        }
      }
      return out.slice(0, maxItems);
    });

/** HTML date/datetime-local input (Dhaka wall-clock) → Date, or null when empty. */
export const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = parseLocalInput(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date." });
      return z.NEVER;
    }
    return d;
  });

export const requiredDate = z
  .string()
  .trim()
  .min(1, "Pick a date.")
  .transform((v, ctx) => {
    const d = parseLocalInput(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date." });
      return z.NEVER;
    }
    return d;
  });

/** Calendar date without time (e.g. date of birth), stored as UTC midnight. */
export const optionalDateOnly = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = parseDateOnly(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date." });
      return z.NEVER;
    }
    return d;
  });

export const checkbox = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean()])
  .optional()
  .transform((v) => v === "on" || v === "true" || v === true);

export const idSchema = z.string().min(1).max(64);

export const pageSchema = z.coerce.number().int().min(1).max(1000).catch(1);
