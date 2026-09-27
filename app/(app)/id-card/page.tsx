import type { Metadata } from "next";
import QRCode from "qrcode";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { getOwnProfile } from "@/services/profiles";
import { env } from "@/lib/env";
import { PageHeader } from "@/components/shared/page-header";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LogoMark } from "@/components/shared/logo";
import { PrintButton } from "@/components/id-card/print-button";

export const metadata: Metadata = { title: "Digital Batch ID" };

export default async function IdCardPage() {
  const viewer = await requireUser();
  const { user, profile } = await getOwnProfile(viewer.id);
  const name = profile?.fullName ?? user.roll;

  // The QR code only encodes the profile URL. That route requires sign-in and applies the
  // owner's privacy settings, so scanning it never reveals private information.
  const profileUrl = `${env.APP_URL}/students/${encodeURIComponent(user.roll)}`;
  const qrSvg = await QRCode.toString(profileUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#1e1b4b", light: "#ffffff" } });
  const qrSrc = `data:image/svg+xml;base64,${Buffer.from(qrSvg).toString("base64")}`;

  return (
    <>
      <PageHeader
        title="Digital Batch ID"
        description="Your CSE 24 identity card. The QR code opens your batch profile for signed-in members only."
        actions={<PrintButton />}
        className="print:hidden"
      />

      <div className="flex justify-center py-4">
        <article
          aria-label={`Batch ID card for ${name}`}
          className="relative w-full max-w-[420px] overflow-hidden rounded-3xl bg-card shadow-xl ring-1 ring-foreground/10 print:shadow-none"
        >
          <div className="bg-brand-gradient relative h-36 px-6 pt-5 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.3),transparent_40%)]" aria-hidden />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <LogoMark className="bg-white/20 bg-none shadow-none backdrop-blur" />
                <div className="leading-tight">
                  <p className="text-sm font-semibold">CSE 24</p>
                  <p className="text-[11px] text-white/80">Batch Digital Community</p>
                </div>
              </div>
              <span className="rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase backdrop-blur">
                Student
              </span>
            </div>
          </div>

          <div className="-mt-14 px-6 pb-6">
            <UserAvatar name={name} avatarKey={profile?.avatarKey} size="2xl" className="ring-4 ring-card" />
            <h2 className="mt-3 flex items-center gap-1.5 text-xl font-semibold tracking-tight">
              {name}
              {profile?.isVerified ? <BadgeCheck className="size-5 text-primary" aria-label="Verified profile" /> : null}
            </h2>
            {profile?.nickname ? <p className="text-sm text-muted-foreground">“{profile.nickname}”</p> : null}

            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">Roll</dt>
                <dd className="font-mono font-semibold">{user.roll}</dd>
              </div>
              <div>
                <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">Batch</dt>
                <dd className="font-semibold">{profile?.batch ?? "CSE 24"}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">Department</dt>
                <dd className="font-semibold">{profile?.department ?? "Computer Science & Engineering"}</dd>
              </div>
            </dl>

            <div className="mt-6 flex items-end justify-between gap-4 border-t pt-5">
              <p className="flex max-w-[55%] items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
                Scan to open this member&apos;s profile. Sign-in required; only details they share are shown.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element -- inline data URI QR code */}
              <img src={qrSrc} alt={`QR code linking to the profile of ${name}`} className="size-28 rounded-lg bg-white p-2 ring-1 ring-foreground/10" />
            </div>
          </div>
        </article>
      </div>
    </>
  );
}
