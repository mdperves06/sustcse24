import { z } from "zod";
import { rollSchema } from "./auth";
import { checkbox, optionalText, requiredText } from "./common";
import { parseLocalInput } from "@/lib/time";

export const ROLES = ["STUDENT", "MODERATOR", "ADMIN"] as const;
export const ACCOUNT_STATUSES = ["ACTIVE", "DISABLED"] as const;
export const REPORT_STATUSES = ["PENDING", "RESOLVED", "DISMISSED"] as const;

/** "" / null → null; undefined stays undefined (= "leave unchanged" for partial updates). */
const nullableEmail = z
  .union([z.literal(""), z.null(), z.email("Enter a valid email address.").max(200, "Use at most 200 characters.")])
  .optional()
  .transform((v) => (v === undefined ? undefined : v ? v.toLowerCase() : null));

const nullableStudentId = z
  .union([
    z.literal(""),
    z.null(),
    z
      .string()
      .trim()
      .max(30, "Use at most 30 characters.")
      .regex(/^[A-Za-z0-9/_.-]*$/, "Student IDs contain only letters, digits, dots, dashes, slashes and underscores."),
  ])
  .optional()
  .transform((v) => (v === undefined ? undefined : v ? v : null));

// ───────────────────────────── Students ─────────────────────────────

export const createStudentSchema = z.object({
  roll: rollSchema,
  fullName: requiredText(100, "Full name"),
  studentId: nullableStudentId.transform((v) => v ?? null),
  email: nullableEmail.transform((v) => v ?? null),
});
export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const updateStudentSchema = z.object({
  fullName: requiredText(100, "Full name").optional(),
  studentId: nullableStudentId,
  email: nullableEmail,
});
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

export const roleSchema = z.enum(ROLES, "Choose a role.");
export const statusSchema = z.enum(ACCOUNT_STATUSES, "Choose a status.");

/** Accepts an ISO timestamp (API) or a date / datetime-local value (forms, Dhaka time). */
const restrictionUntil = z
  .union([z.string().trim(), z.null()])
  .transform((v, ctx) => {
    if (!v) return null;
    const d = parseLocalInput(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date." });
      return z.NEVER;
    }
    if (d.getTime() <= Date.now()) {
      ctx.addIssue({ code: "custom", message: "Pick a date in the future." });
      return z.NEVER;
    }
    if (d.getTime() > Date.now() + 366 * 86_400_000) {
      ctx.addIssue({ code: "custom", message: "Restrictions can last at most one year." });
      return z.NEVER;
    }
    return d;
  });

export const restrictionSchema = z.object({
  until: restrictionUntil,
  reason: optionalText(300),
});

/** Moderation shortcut: restrict for N days. */
export const restrictForDaysSchema = z.object({
  days: z.coerce.number().int("Enter whole days.").min(1, "At least 1 day.").max(365, "At most 365 days."),
  reason: optionalText(300),
});

/** PATCH /api/admin/users/:id */
export const adminUserPatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("update") }).extend(updateStudentSchema.shape),
  z.object({ action: z.literal("setRole"), role: roleSchema }),
  z.object({ action: z.literal("setStatus"), status: statusSchema }),
  z.object({ action: z.literal("resetPassword") }),
  z.object({ action: z.literal("delete") }),
  z.object({ action: z.literal("restore") }),
  z.object({ action: z.literal("unlock") }),
  z.object({ action: z.literal("verify"), verified: z.boolean() }),
  z.object({ action: z.literal("restrict") }).extend(restrictionSchema.shape),
]);
export type AdminUserPatch = z.infer<typeof adminUserPatchSchema>;

export const STUDENT_FLAGS = ["default_password", "locked", "restricted", "unverified"] as const;

export const studentFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  role: z.enum(ROLES).optional().catch(undefined),
  status: z.enum(["active", "disabled"]).optional().catch(undefined),
  flag: z.enum(STUDENT_FLAGS).optional().catch(undefined),
  deleted: z.enum(["1"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).default(1).catch(1),
});
export type StudentFilters = z.infer<typeof studentFiltersSchema>;

// ───────────────────────────── Import ─────────────────────────────

export const importRequestSchema = z.object({
  csv: z.string().min(1, "Paste CSV text or choose a file.").max(600_000, "The CSV is too large."),
  dryRun: checkbox,
});

// ───────────────────────────── Moderation ─────────────────────────────

export const reportFiltersSchema = z.object({
  status: z.enum(REPORT_STATUSES).default("PENDING").catch("PENDING"),
  page: z.coerce.number().int().min(1).max(1000).default(1).catch(1),
});

export const reportDecisionSchema = z.object({
  decision: z.enum(["remove", "dismiss", "resolve"], "Choose an action."),
  note: optionalText(300),
});
export type ReportDecision = z.infer<typeof reportDecisionSchema>;

// ───────────────────────────── Audit log ─────────────────────────────

const dateOnly = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()
  .catch(undefined);

export const auditFiltersSchema = z.object({
  action: z.string().trim().max(60).optional().catch(undefined),
  actor: z.string().trim().max(20).optional().catch(undefined),
  entity: z.string().trim().max(40).optional().catch(undefined),
  entityId: z.string().trim().max(64).optional().catch(undefined),
  from: dateOnly,
  to: dateOnly,
  page: z.coerce.number().int().min(1).max(1000).default(1).catch(1),
});
export type AuditFilters = z.infer<typeof auditFiltersSchema>;

// ───────────────────────────── Settings ─────────────────────────────

export const systemSettingsSchema = z.object({
  aiAssistantEnabled: checkbox,
  studentResourceUploads: checkbox,
  studentOpportunityPosts: checkbox,
  siteNotice: z
    .string()
    .trim()
    .max(300, "Use at most 300 characters.")
    .optional()
    .transform((v) => v ?? ""),
});
export type SystemSettingsInput = z.infer<typeof systemSettingsSchema>;

export const idParam = z.string().min(1).max(64);
