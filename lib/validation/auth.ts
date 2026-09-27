import { z } from "zod";

export const rollSchema = z
  .string()
  .trim()
  .min(3, "Enter your roll number.")
  .max(20, "Roll number is too long.")
  .regex(/^[A-Za-z0-9-]+$/, "Roll numbers contain only letters, digits and dashes.");

export const loginSchema = z.object({
  roll: rollSchema,
  password: z.string().min(1, "Enter your password.").max(200),
  remember: z.coerce.boolean().optional().default(false),
  next: z.string().optional(),
});

/** Password policy: 8+ chars, at least one letter and one number. */
export const newPasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use at most 128 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    message: "Choose a password different from your current one.",
  });

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(3, "Enter your roll or email.").max(200),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    newPassword: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });
