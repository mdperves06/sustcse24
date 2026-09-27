/** Canonical slug for a skill so "React", "react " and "REACT" are the same skill. */
export function skillSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/#/g, "sharp")
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
