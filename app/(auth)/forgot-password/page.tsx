import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ForgotPasswordForm } from "./forgot-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your roll or the email on your profile. We&apos;ll send a one-time reset link.
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="text-xs text-muted-foreground">
        No email on your profile yet? Ask a batch admin to reset your password — it will go back to your roll number and
        you&apos;ll choose a new one on next sign-in.
      </p>
      <Link href="/login" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Back to sign in
      </Link>
    </div>
  );
}
