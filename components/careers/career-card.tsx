import Link from "next/link";
import { BadgeCheck, Building2, Factory, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { SocialIcon } from "@/components/students/social-icon";
import { EMPLOYMENT_LABELS } from "@/lib/labels";
import type { CareerMember } from "@/services/careers";

export function CareerCard({ member: m }: { member: CareerMember }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <UserAvatar name={m.fullName} avatarKey={m.avatarKey} size="lg" />
        <div className="min-w-0 flex-1">
          <Link href={`/students/${encodeURIComponent(m.roll)}`} className="flex items-center gap-1.5 font-semibold hover:underline">
            <span className="truncate">{m.fullName}</span>
            {m.isVerified ? <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified profile" /> : null}
          </Link>
          <p className="font-mono text-xs text-muted-foreground">{m.roll}</p>
          <Badge variant="outline" className="mt-1.5">
            {EMPLOYMENT_LABELS[m.employmentStatus]}
          </Badge>
        </div>
        {m.linkedinUrl ? (
          <a
            href={m.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={`${m.fullName} on LinkedIn`}
          >
            <SocialIcon kind="linkedin" className="size-4" />
          </a>
        ) : null}
      </div>
      <dl className="mt-4 space-y-1.5 text-sm">
        {m.position || m.organization ? (
          <div className="flex items-start gap-2">
            <dt className="sr-only">Role</dt>
            <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <dd className="font-medium">
              {m.position}
              {m.position && m.organization ? " at " : ""}
              {m.organization ? (
                <Link href={`/careers?company=${encodeURIComponent(m.organization)}`} className="hover:underline">
                  {m.organization}
                </Link>
              ) : null}
            </dd>
          </div>
        ) : null}
        {m.industry ? (
          <div className="flex items-start gap-2 text-muted-foreground">
            <dt className="sr-only">Industry</dt>
            <Factory className="mt-0.5 size-4 shrink-0" aria-hidden />
            <dd>
              <Link href={`/careers?industry=${encodeURIComponent(m.industry)}`} className="hover:underline">
                {m.industry}
              </Link>
            </dd>
          </div>
        ) : null}
        {m.location ? (
          <div className="flex items-start gap-2 text-muted-foreground">
            <dt className="sr-only">Location</dt>
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
            <dd>{m.location}</dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}
