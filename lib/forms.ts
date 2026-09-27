/**
 * Converts FormData into a plain object. Keys that appear more than once, or end
 * in "[]", become arrays. File entries with no content are dropped.
 */
export function formToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [rawKey, value] of formData.entries()) {
    if (rawKey.startsWith("$ACTION")) continue;
    if (typeof value !== "string" && value.size === 0) continue;
    const isArray = rawKey.endsWith("[]");
    const key = isArray ? rawKey.slice(0, -2) : rawKey;
    if (isArray) {
      ((out[key] ??= []) as unknown[]).push(value);
    } else if (key in out) {
      const prev = out[key];
      out[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function getFile(formData: FormData, key: string): File | null {
  const value = formData.get(key);
  return value && typeof value !== "string" && value.size > 0 ? value : null;
}

export function getFiles(formData: FormData, key: string): File[] {
  return formData
    .getAll(key)
    .filter((v): v is File => typeof v !== "string" && v.size > 0);
}
