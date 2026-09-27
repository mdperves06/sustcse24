import type { Metadata } from "next";
import { CheckCircle2, CircleAlert, Server, SlidersHorizontal } from "lucide-react";
import { requirePermission } from "@/lib/auth/current-user";
import { getEnvironmentStatus, getSystemSettings } from "@/services/system-settings";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "System settings · Admin" };

function StatusRow({ label, ok, detail }: { label: string; ok: boolean | null; detail: string }) {
  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      {ok === null ? (
        <Badge variant="secondary">n/a</Badge>
      ) : ok ? (
        <Badge variant="outline" className="border-chart-5/30 bg-chart-5/10 text-chart-5">
          <CheckCircle2 aria-hidden /> Configured
        </Badge>
      ) : (
        <Badge variant="outline" className="border-chart-3/30 bg-chart-3/10 text-chart-3">
          <CircleAlert aria-hidden /> Not configured
        </Badge>
      )}
    </li>
  );
}

export default async function SystemSettingsPage() {
  const viewer = await requirePermission("settings.manage");
  const [settings, envStatus] = await Promise.all([getSystemSettings(viewer), Promise.resolve(getEnvironmentStatus(viewer))]);

  return (
    <>
      <PageHeader title="System settings" description="Platform-wide switches. Changes apply immediately and are recorded in the audit log." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-primary" aria-hidden /> Features
            </CardTitle>
            <CardDescription>Control what batch members can do.</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm values={settings} aiConfigured={envStatus.aiConfigured} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="size-4 text-primary" aria-hidden /> Environment
            </CardTitle>
            <CardDescription>Read-only. Configured through server environment variables; secret values are never shown.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              <StatusRow
                label="Email (SMTP)"
                ok={envStatus.mailConfigured}
                detail={envStatus.mailConfigured ? "Password-reset emails are delivered." : "Password-reset emails can't be delivered; admins must reset passwords."}
              />
              <StatusRow
                label="AI assistant"
                ok={envStatus.aiConfigured}
                detail={envStatus.aiConfigured ? "An AI provider key is set (Gemini or Anthropic)." : "Set GEMINI_API_KEY or ANTHROPIC_API_KEY to enable the assistant."}
              />
              <StatusRow
                label="File storage"
                ok={envStatus.s3Configured}
                detail={envStatus.storageDriver === "s3" ? "S3-compatible object storage." : "Local disk storage on the server."}
              />
            </ul>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <dt className="text-muted-foreground">Storage driver</dt>
              <dd className="text-right font-mono">{envStatus.storageDriver}</dd>
              <dt className="text-muted-foreground">Environment</dt>
              <dd className="text-right font-mono">{envStatus.nodeEnv}</dd>
              <dt className="text-muted-foreground">App URL</dt>
              <dd className="truncate text-right font-mono" title={envStatus.appUrl}>
                {envStatus.appUrl}
              </dd>
            </dl>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
