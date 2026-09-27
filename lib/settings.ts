import "server-only";
import { db } from "@/lib/db";

/** Admin-editable system settings with typed defaults. */
export const SETTING_DEFAULTS = {
  aiAssistantEnabled: true,
  studentResourceUploads: true,
  studentOpportunityPosts: true,
  siteNotice: "",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = { -readonly [K in SettingKey]: (typeof SETTING_DEFAULTS)[K] extends boolean ? boolean : string };

export async function getSettings(): Promise<Settings> {
  const rows = await db.systemSetting.findMany();
  const out = { ...SETTING_DEFAULTS } as Settings;
  for (const row of rows) {
    if (row.key in SETTING_DEFAULTS) {
      const def = SETTING_DEFAULTS[row.key as SettingKey];
      if (typeof row.value === typeof def) (out as Record<string, unknown>)[row.key] = row.value;
    }
  }
  return out;
}

export async function getSetting<K extends SettingKey>(key: K): Promise<Settings[K]> {
  return (await getSettings())[key];
}
