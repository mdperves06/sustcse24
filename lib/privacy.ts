import type { Prisma } from "@/lib/generated/prisma/client";
import type { Role, Visibility } from "@/lib/generated/prisma/enums";

export type Viewer = { id: string; role: Role };

export type PrivacyFlags = {
  emailVisibility: Visibility;
  phoneVisibility: Visibility;
  facebookVisibility: Visibility;
  linkedinVisibility: Visibility;
  githubVisibility: Visibility;
  locationVisibility: Visibility;
  birthdayVisibility: Visibility;
  bloodGroupVisibility: Visibility;
  careerVisibility: Visibility;
  cvVisibility: Visibility;
};

export const DEFAULT_PRIVACY: PrivacyFlags = {
  emailVisibility: "BATCH",
  phoneVisibility: "PRIVATE",
  facebookVisibility: "BATCH",
  linkedinVisibility: "BATCH",
  githubVisibility: "BATCH",
  locationVisibility: "BATCH",
  birthdayVisibility: "BATCH",
  bloodGroupVisibility: "BATCH",
  careerVisibility: "BATCH",
  cvVisibility: "PRIVATE",
};

/** Human-readable description of each privacy-controlled field, used on the settings page. */
export const PRIVACY_FIELDS: { key: keyof PrivacyFlags; label: string; description: string }[] = [
  { key: "emailVisibility", label: "Email", description: "Your email address" },
  { key: "phoneVisibility", label: "Phone", description: "Your phone number" },
  { key: "locationVisibility", label: "Location", description: "City / area you live in" },
  { key: "birthdayVisibility", label: "Birthday", description: "Day and month only — your birth year is never shown" },
  { key: "bloodGroupVisibility", label: "Blood group", description: "Useful for emergencies within the batch" },
  { key: "facebookVisibility", label: "Facebook", description: "Link to your Facebook profile" },
  { key: "linkedinVisibility", label: "LinkedIn", description: "Link to your LinkedIn profile" },
  { key: "githubVisibility", label: "GitHub", description: "Link to your GitHub profile" },
  { key: "careerVisibility", label: "Career details", description: "Organization, position and industry (also controls the Career Network)" },
  { key: "cvVisibility", label: "CV", description: "Your uploaded CV (PDF)" },
];

/**
 * A field is visible when the viewer owns the profile or the owner shared it with the batch.
 * Staff get no special pass here: admin tooling reads contact details through its own audited paths.
 */
export function canSee(visibility: Visibility, viewer: Viewer, ownerId: string): boolean {
  return viewer.id === ownerId || visibility === "BATCH";
}

/** Prisma filter: only profiles that share a given field with the batch. */
export function sharedWithBatch(field: keyof PrivacyFlags): Prisma.UserWhereInput {
  // Users without a privacy row fall back to defaults.
  if (DEFAULT_PRIVACY[field] === "BATCH") {
    return { OR: [{ privacy: { is: null } }, { privacy: { is: { [field]: "BATCH" } } }] };
  }
  return { privacy: { is: { [field]: "BATCH" } } };
}
