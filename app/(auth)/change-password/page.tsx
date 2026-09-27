import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { logoutAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Choose a new password" };

/**
 * Mandatory password change. Users on the default password are redirected here
 * from every other page and cannot use the app until they finish.
 */
export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPasswordChange: true });

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {user.mustChangePassword ? `Hi ${user.fullName.split(" ")[0]}, secure your account` : "Change password"}
        </h1>
        <p className="text-sm text-muted-foreground">Signed in as {user.roll}</p>
      </div>
      {user.mustChangePassword ? (
        <div className="flex gap-3 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          <p>
            You&apos;re using the temporary password (your roll number). Choose a new password to continue to the
            community.
          </p>
        </div>
      ) : null}
      <ChangePasswordForm />
      <form action={logoutAction}>
        <Button type="submit" variant="ghost" className="w-full text-muted-foreground">
          Sign out instead
        </Button>
      </form>
    </div>
  );
}
