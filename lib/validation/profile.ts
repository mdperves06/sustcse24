import { z } from "zod";
import { optionalDateOnly, optionalText, optionalUrl, requiredText, safeUrl, tagList } from "./common";

const bloodGroups = ["A_POS", "A_NEG", "B_POS", "B_NEG", "AB_POS", "AB_NEG", "O_POS", "O_NEG"] as const;
const employmentStatuses = [
  "STUDENT",
  "EMPLOYED",
  "INTERN",
  "FREELANCER",
  "SEEKING",
  "HIGHER_STUDIES",
  "ENTREPRENEUR",
  "OTHER",
] as const;

const phone = z
  .string()
  .trim()
  .max(20)
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => !v || /^[+\d][\d\s-]{5,19}$/.test(v), "Enter a valid phone number.");

const otherLink = z.object({ label: requiredText(40, "Label"), url: safeUrl });

export const profileSchema = z.object({
  fullName: requiredText(100, "Full name"),
  nickname: optionalText(40),
  email: z
    .union([z.literal(""), z.email("Enter a valid email address.").max(200)])
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null)),
  phone,
  bloodGroup: z
    .union([z.literal(""), z.enum(bloodGroups)])
    .optional()
    .transform((v) => (v ? v : null)),
  location: optionalText(100),
  bio: optionalText(500),
  dateOfBirth: optionalDateOnly.refine(
    (d) => !d || (d.getTime() < Date.now() && d.getUTCFullYear() > 1950),
    "Enter a valid date of birth.",
  ),

  interests: tagList(20),
  academicInterests: tagList(20),
  programmingLanguages: tagList(30),
  frameworks: tagList(30),
  tools: tagList(30),
  otherSkills: tagList(30),

  facebookUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  otherLinks: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return [];
      try {
        return z.array(otherLink).max(10).parse(JSON.parse(v));
      } catch {
        ctx.addIssue({ code: "custom", message: "Check your extra links." });
        return z.NEVER;
      }
    }),

  currentOrganization: optionalText(120),
  position: optionalText(120),
  industry: optionalText(80),
  employmentStatus: z.enum(employmentStatuses).default("STUDENT"),
  careerInterests: tagList(20),

  hobbies: tagList(20),
  certifications: tagList(30, 120),
});

export type ProfileInput = z.infer<typeof profileSchema>;

const visibility = z.enum(["BATCH", "PRIVATE"]);

export const privacySchema = z.object({
  emailVisibility: visibility,
  phoneVisibility: visibility,
  facebookVisibility: visibility,
  linkedinVisibility: visibility,
  githubVisibility: visibility,
  locationVisibility: visibility,
  birthdayVisibility: visibility,
  bloodGroupVisibility: visibility,
  careerVisibility: visibility,
  cvVisibility: visibility,
});
