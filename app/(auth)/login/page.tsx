import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect(user.mustChangePassword ? "/change-password" : "/dashboard");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const notice = sp.reset
    ? "Your password was reset. Sign in with your new password."
    : sp.signedOut
      ? "You've been signed out."
      : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in with your roll number.</p>
      </div>
      {notice ? (
        <p role="status" className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="size-4" aria-hidden /> {notice}
        </p>
      ) : null}
      <LoginForm next={next} />
      <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">First time here?</p>
        <p className="mt-1">
          Your initial password is your roll number. You&apos;ll be asked to choose a new password right after signing in.
        </p>
      </div>
    </div>
  );
}
