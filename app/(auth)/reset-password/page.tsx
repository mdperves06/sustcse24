import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "./reset-form";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="text-sm text-muted-foreground">You&apos;ll be signed out of all devices afterwards.</p>
      </div>
      {value ? (
        <ResetPasswordForm token={value} />
      ) : (
        <p className="rounded-lg border bg-muted/40 p-3 text-sm">
          This page needs a reset link.{" "}
          <Link href="/forgot-password" className="font-medium text-primary hover:underline">
            Request a new one
          </Link>
          .
        </p>
      )}
    </div>
  );
}
