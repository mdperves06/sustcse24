import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { isMailConfigured } from "@/lib/mailer";
import { assertCan } from "@/lib/auth/permissions";
import { getSettings, SETTING_DEFAULTS, type SettingKey, type Settings } from "@/lib/settings";
import { systemSettingsSchema } from "@/lib/validation/admin";
import { recordAudit } from "@/services/audit-log";
import type { Viewer } from "@/lib/privacy";

export async function getSystemSettings(actor: Viewer): Promise<Settings> {
  assertCan(actor, "settings.manage");
  return getSettings();
}

/** Upserts every known setting; returns the keys that actually changed. */
export async function updateSystemSettings(actor: Viewer, input: unknown): Promise<SettingKey[]> {
  assertCan(actor, "settings.manage");
  const next = systemSettingsSchema.parse(input);
  const current = await getSettings();
  const keys = Object.keys(SETTING_DEFAULTS) as SettingKey[];
  const changed = keys.filter((k) => current[k] !== next[k]);
  if (changed.length === 0) return [];

  await db.$transaction(
    changed.map((key) =>
      db.systemSetting.upsert({
        where: { key },
        update: { value: next[key] },
        create: { key, value: next[key] },
      }),
    ),
  );
  await recordAudit(actor, "settings.update", "SystemSetting", null, {
    changes: Object.fromEntries(changed.map((k) => [k, { from: current[k], to: next[k] }])),
  });
  return changed;
}

/** Read-only environment status — booleans and non-secret names only, never values. */
export function getEnvironmentStatus(actor: Viewer) {
  assertCan(actor, "settings.manage");
  return {
    mailConfigured: isMailConfigured(),
    aiConfigured: Boolean(env.GEMINI_API_KEY || env.ANTHROPIC_API_KEY),
    storageDriver: env.STORAGE_DRIVER,
    s3Configured: env.STORAGE_DRIVER === "s3" ? Boolean(env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) : null,
    nodeEnv: env.NODE_ENV,
    appUrl: env.APP_URL,
  };
}
