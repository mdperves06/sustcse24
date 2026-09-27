import Link from "next/link";
import {
  Briefcase,
  Building2,
  CalendarDays,
  Code2,
  ExternalLink,
  FlaskConical,
  GraduationCap,
  Laptop,
  MapPin,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/shared/rich-text";
import { DeadlineBadge } from "@/components/opportunities/deadline-badge";
import { OpportunityBookmarkButton } from "@/components/opportunities/bookmark-button";
import { EditOpportunityDialog } from "@/components/opportunities/opportunity-form";
import { DeleteOpportunityButton } from "@/components/opportunities/delete-opportunity-button";
import { OPPORTUNITY_TYPE_LABELS } from "@/lib/labels";
import { formatDate, formatRelative, toLocalInputValue } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { OpportunityType } from "@/lib/generated/prisma/enums";
import type { OpportunityItem } from "@/services/opportunities";

export const OPPORTUNITY_TYPE_ICONS: Record<OpportunityType, LucideIcon> = {
  INTERNSHIP: GraduationCap,
  JOB: Briefcase,
  HACKATHON: Code2,
  SCHOLARSHIP: GraduationCap,
  COMPETITION: Trophy,
  RESEARCH: FlaskConical,
  FREELANCING: Laptop,
};

export function OpportunityCard({ opportunity: o }: { opportunity: OpportunityItem }) {
  const Icon = OPPORTUNITY_TYPE_ICONS[o.type];
  const long = o.description.length > 220;

  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-2xl border bg-card p-5 shadow-xs transition-all hover:shadow-md",
        o.urgent && "border-warning/50 ring-1 ring-warning/20",
        o.expired && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary">{OPPORTUNITY_TYPE_LABELS[o.type]}</Badge>
            <DeadlineBadge daysLeft={o.daysLeft} expired={o.expired} urgent={o.urgent} />
            {o.urgent ? (
              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-warning">
                <Zap className="size-3" aria-hidden /> Urgent
              </span>
            ) : null}
          </div>
          <h3 className="mt-1.5 leading-snug font-semibold">{o.title}</h3>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Building2 className="size-3.5" aria-hidden /> {o.organization}
            </span>
            {o.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden /> {o.location}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <OpportunityBookmarkButton id={o.id} title={o.title} saved={o.saved} />
          {o.canEdit ? (
            <>
              <EditOpportunityDialog
                defaults={{
                  id: o.id,
                  title: o.title,
                  organization: o.organization,
                  description: o.description,
                  type: o.type,
                  location: o.location,
                  deadline: toLocalInputValue(o.deadline, "date"),
                  applyUrl: o.applyUrl,
                }}
              />
              <DeleteOpportunityButton id={o.id} title={o.title} />
            </>
          ) : null}
        </div>
      </div>

      {long ? (
        <details className="group mt-3">
          <summary className="cursor-pointer list-none text-sm text-muted-foreground [&::-webkit-details-marker]:hidden">
            <span className="line-clamp-3 group-open:hidden">{o.description}</span>
            <span className="mt-1 inline-block text-xs font-medium text-primary group-open:hidden">Read more</span>
            <span className="hidden text-xs font-medium text-primary group-open:inline">Show less</span>
          </summary>
          <RichText text={o.description} className="mt-2 text-muted-foreground" />
        </details>
      ) : (
        <RichText text={o.description} className="mt-3 text-muted-foreground" />
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
        <p className="text-xs text-muted-foreground">
          {o.deadline ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden /> Deadline {formatDate(o.deadline)}
            </span>
          ) : null}
          <span className="block">
            Posted {formatRelative(o.createdAt)} by{" "}
            <Link href={`/students/${encodeURIComponent(o.postedBy.roll)}`} className="font-medium hover:underline">
              {o.postedBy.name}
            </Link>
          </span>
        </p>
        {o.applyUrl && !o.expired ? (
          <Button size="sm" asChild>
            <a href={o.applyUrl} target="_blank" rel="noopener noreferrer nofollow">
              Apply <ExternalLink aria-hidden />
            </a>
          </Button>
        ) : o.applyUrl ? (
          <Button size="sm" variant="outline" asChild>
            <a href={o.applyUrl} target="_blank" rel="noopener noreferrer nofollow">
              View listing <ExternalLink aria-hidden />
            </a>
          </Button>
        ) : null}
      </div>
    </article>
  );
}
