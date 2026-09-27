import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, Laptop, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { listSessions } from "@/services/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { RevokeSessionButton } from "@/components/auth/revoke-session-button";
import { formatDateTime, formatRelative } from "@/lib/time";

export const metadata: Metadata = { title: "Settings" };

function describeAgent(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} on ${os}` : browser;
}

export default async function SettingsPage() {
  const user = await requireUser();
  const sessions = await listSessions(user.id);

  return (
    <>
      <PageHeader title="Settings" description="Manage your password, signed-in devices and privacy." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4 text-primary" aria-hidden /> Change password
            </CardTitle>
            <CardDescription>Changing your password signs out every other device.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Laptop className="size-4 text-primary" aria-hidden /> Active sessions
              </CardTitle>
              <CardDescription>Devices currently signed in to your account.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {sessions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        {describeAgent(s.userAgent)}
                        {s.id === user.sessionId ? <Badge variant="secondary">This device</Badge> : null}
                        {s.rememberMe ? <Badge variant="outline">Remembered</Badge> : null}
                      </p>
                      <p className="text-xs text-muted-foreground" title={formatDateTime(s.lastSeenAt)}>
                        Active {formatRelative(s.lastSeenAt)} · signed in {formatDateTime(s.createdAt)}
                      </p>
                    </div>
                    {s.id !== user.sessionId ? <RevokeSessionButton sessionId={s.id} /> : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" aria-hidden /> Privacy
              </CardTitle>
              <CardDescription>Choose which personal details other batch members can see.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" asChild>
                <Link href="/profile/edit?tab=privacy">Open privacy settings</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
