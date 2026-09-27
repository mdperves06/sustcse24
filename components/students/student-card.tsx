import Link from "next/link";
import { BadgeCheck, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { StudentCard as Card } from "@/services/directory";
import { cn } from "@/lib/utils";

function roleLine(s: Card) {
  if (s.position && s.organization) return `${s.position} · ${s.organization}`;
  return s.position ?? s.organization;
}

export function StudentCard({ student, layout = "grid" }: { student: Card; layout?: "grid" | "list" }) {
  const role = roleLine(student);
  const href = `/students/${encodeURIComponent(student.roll)}`;

  if (layout === "list") {
    return (
      <Link
        href={href}
        className="group flex items-center gap-4 rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary/30 hover:bg-accent/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <UserAvatar name={student.fullName} avatarKey={student.avatarKey} size="md" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate font-medium">
            {student.fullName}
            {student.isVerified ? <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified profile" /> : null}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {student.roll}
            {role ? ` · ${role}` : ""}
          </p>
        </div>
        <div className="hidden max-w-[40%] flex-wrap justify-end gap-1 md:flex">
          {student.skills.slice(0, 4).map((s) => (
            <Badge key={s} variant="secondary">
              {s}
            </Badge>
          ))}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group flex h-full flex-col rounded-2xl border bg-card p-5 shadow-xs transition-all",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      )}
    >
      <div className="flex items-start gap-3">
        <UserAvatar name={student.fullName} avatarKey={student.avatarKey} size="lg" />
        <div className="min-w-0">
          <p className="flex items-start gap-1.5 font-semibold leading-tight">
            <span className="line-clamp-2 break-words">{student.fullName}</span>
            {student.isVerified ? <BadgeCheck className="size-4 shrink-0 text-primary" aria-label="Verified profile" /> : null}
          </p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">{student.roll}</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
        {student.bio ?? <span className="italic opacity-70">No bio yet</span>}
      </p>
      {role ? (
        <p className="mt-2 flex items-center gap-1.5 truncate text-xs font-medium">
          <Briefcase className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">{role}</span>
        </p>
      ) : null}
      <div className="mt-auto flex flex-wrap gap-1 pt-4">
        {student.skills.slice(0, 4).map((s) => (
          <Badge key={s} variant="secondary">
            {s}
          </Badge>
        ))}
        {student.skills.length > 4 ? <Badge variant="outline">+{student.skills.length - 4}</Badge> : null}
      </div>
    </Link>
  );
}
