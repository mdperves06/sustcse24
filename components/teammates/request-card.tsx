import Link from "next/link";
import { CalendarClock, ExternalLink, Lock, Mail, MessageSquare, Phone, Sparkles, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RichText } from "@/components/shared/rich-text";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RequestOwnerActions } from "@/components/teammates/request-owner-actions";
import { formatDate, formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";
import type { TeammateRequestItem } from "@/services/teammates";

function deadlineText(r: TeammateRequestItem) {
  if (!r.deadline || r.daysLeft === null) return null;
  if (r.deadlinePassed) return `Deadline passed (${formatDate(r.deadline)})`;
  if (r.daysLeft <= 0) return "Deadline today";
  if (r.daysLeft === 1) return "Deadline tomorrow";
  return `${r.daysLeft} days left · ${formatDate(r.deadline)}`;
}

function Contact({ r }: { r: TeammateRequestItem }) {
  const profileHref = `/students/${encodeURIComponent(r.author.roll)}`;
  const c = r.contact;
  if (c.kind === "email")
    return (
      <Button size="sm" asChild>
        <a href={`mailto:${c.value}?subject=${encodeURIComponent(`Teammate request: ${r.title}`)}`}>
          <Mail aria-hidden /> {c.value}
        </a>
      </Button>
    );
  if (c.kind === "phone")
    return (
      <Button size="sm" asChild>
        <a href={`tel:${c.value}`}>
          <Phone aria-hidden /> {c.value}
        </a>
      </Button>
    );
  if (c.kind === "link")
    return (
      <Button size="sm" asChild>
        <a href={c.value} target="_blank" rel="noopener noreferrer nofollow">
          <ExternalLink aria-hidden /> Message on {c.label}
        </a>
      </Button>
    );
  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant={c.kind === "profile" ? "default" : "outline"} asChild>
        <Link href={profileHref}>
          <MessageSquare aria-hidden /> Contact via profile
        </Link>
      </Button>
      {c.kind === "hidden" ? (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Lock className="size-3" aria-hidden /> Their preferred contact is private
        </span>
      ) : null}
    </div>
  );
}

export function TeammateRequestCard({ request: r }: { request: TeammateRequestItem }) {
  const closed = r.status === "CLOSED";
  const matched = new Set(r.matchedSkills);
  const deadline = deadlineText(r);

  return (
    <article className={cn("flex h-full flex-col rounded-2xl border bg-card p-5 shadow-xs", closed && "opacity-75")}>
      <div className="flex items-start justify-between gap-3">
        <Link href={`/students/${encodeURIComponent(r.author.roll)}`} className="flex min-w-0 items-center gap-2 hover:underline">
          <UserAvatar name={r.author.name} avatarKey={r.author.avatarKey} size="sm" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{r.author.name}</span>
            <span className="block text-xs text-muted-foreground">{formatRelative(r.createdAt)}</span>
          </span>
        </Link>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {closed ? <Badge variant="outline">Closed</Badge> : <Badge className="bg-success/15 text-success">Open</Badge>}
          {r.matchedSkills.length > 0 && !r.isOwner ? (
            <Badge className="bg-primary/10 text-primary">
              <Sparkles aria-hidden /> {r.matchedSkills.length} of your skills match
            </Badge>
          ) : null}
        </div>
      </div>

      <h3 className="mt-3 leading-snug font-semibold">{r.title}</h3>
      <RichText text={r.description} className="mt-1.5 line-clamp-5 text-muted-foreground" />

      <ul className="mt-3 flex flex-wrap gap-1" aria-label="Required skills">
        {r.requiredSkills.map((s) => (
          <li key={s}>
            <Link href={`/teammates?skills=${encodeURIComponent(s)}`}>
              <Badge variant={matched.has(s) ? "default" : "secondary"} className="capitalize">
                {s}
              </Badge>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5" aria-hidden /> Needs {r.teammatesNeeded} teammate{r.teammatesNeeded === 1 ? "" : "s"}
        </span>
        {deadline ? (
          <span className={cn("inline-flex items-center gap-1", r.daysLeft !== null && r.daysLeft <= 3 && !r.deadlinePassed && "text-warning")}>
            <CalendarClock className="size-3.5" aria-hidden /> {deadline}
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-4">
        {r.isOwner || r.canModerate ? (
          <RequestOwnerActions id={r.id} title={r.title} open={!closed} isOwner={r.isOwner} />
        ) : (
          <span />
        )}
        {!r.isOwner && !closed ? <Contact r={r} /> : null}
      </div>
    </article>
  );
}
