import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  FolderGit2,
  Megaphone,
  MessagesSquare,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { globalSearch, searchQuerySchema } from "@/services/search";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StudentCard } from "@/components/students/student-card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  EVENT_TYPE_LABELS,
  OPPORTUNITY_TYPE_LABELS,
  POST_TYPE_LABELS,
  PROJECT_CATEGORY_LABELS,
  RESOURCE_CATEGORY_LABELS,
} from "@/lib/labels";
import { formatDate, formatRelative } from "@/lib/time";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS } from "@/lib/nav";
import { can } from "@/lib/auth/permissions";

/** Extra words people might search for to find a page. */
const PAGE_KEYWORDS: Record<string, string> = {
  "/assistant": "ai assistant chatbot gemini ask help bot",
  "/id-card": "digital id card qr batch id",
  "/directory": "students members batchmates people",
  "/feed": "posts community discussion",
  "/teammates": "team partner hackathon teammate",
  "/achievements": "hall of fame awards achievements verified",
  "/careers": "career jobs company network",
  "/skills": "skill map statistics stats",
  "/resources": "notes slides questions lab academic",
  "/settings": "password sessions privacy settings",
  "/admin": "admin panel import students moderation",
};

function matchPages(q: string, role: Parameters<typeof can>[0]) {
  const needle = q.toLowerCase();
  return NAV_SECTIONS.flatMap((s) => s.items)
    .filter((i) => !i.permission || can(role, i.permission))
    .filter((i) => `${i.label} ${PAGE_KEYWORDS[i.href] ?? ""}`.toLowerCase().includes(needle));
}

export const metadata: Metadata = { title: "Search" };

const TABS = [
  ["all", "All"],
  ["students", "Students"],
  ["posts", "Posts"],
  ["projects", "Projects"],
  ["opportunities", "Opportunities"],
  ["resources", "Resources"],
  ["events", "Events"],
  ["announcements", "Announcements"],
] as const;

function Section({
  title,
  icon: Icon,
  count,
  moreHref,
  children,
}: {
  title: string;
  icon: LucideIcon;
  count: number;
  moreHref?: string;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section aria-labelledby={`sec-${title}`} className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 id={`sec-${title}`} className="flex items-center gap-2 font-semibold">
          <Icon className="size-4 text-primary" aria-hidden /> {title}
          <Badge variant="secondary">{count}</Badge>
        </h2>
        {moreHref ? (
          <Link href={moreHref} className="text-sm font-medium text-primary hover:underline">
            See all
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function ResultLink({ href, title, meta }: { href: string; title: string; meta: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="block rounded-xl border bg-card px-4 py-3 transition-colors hover:border-primary/30 hover:bg-accent/40">
        <p className="line-clamp-1 text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{meta}</p>
      </Link>
    </li>
  );
}

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const viewer = await requireUser();
  const sp = await searchParams;
  const { q, type } = searchQuerySchema.parse(sp);
  const results = q ? await globalSearch(viewer, q, type) : null;
  const pages = q && q.trim().length >= 2 && type === "all" ? matchPages(q.trim(), viewer.role) : [];
  const more = (t: string) => (type === "all" ? `/search?q=${encodeURIComponent(q ?? "")}&type=${t}` : undefined);
  const total = results
    ? pages.length +
      results.students.length + results.posts.length + results.projects.length + results.opportunities.length + results.resources.length + results.events.length + results.announcements.length
    : 0;

  return (
    <>
      <PageHeader title="Search" description="Find students, posts, projects, opportunities, resources and events." />
      <form method="get" role="search" className="mb-4 flex gap-2">
        <label htmlFor="search-q" className="sr-only">
          Search
        </label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input id="search-q" name="q" defaultValue={q} placeholder="Try “React”, “hackathon”, “CSE 331”…" className="h-10 pl-9" autoFocus />
        </div>
        {type !== "all" ? <input type="hidden" name="type" value={type} /> : null}
        <Button type="submit" className="h-10">
          Search
        </Button>
      </form>

      {q ? (
        <nav aria-label="Result type" className="mb-6 flex gap-1 overflow-x-auto pb-1">
          {TABS.map(([value, label]) => (
            <Link
              key={value}
              href={`/search?q=${encodeURIComponent(q)}${value === "all" ? "" : `&type=${value}`}`}
              aria-current={type === value ? "page" : undefined}
              className={cn(buttonVariants({ variant: type === value ? "secondary" : "ghost", size: "sm" }), "shrink-0")}
            >
              {label}
            </Link>
          ))}
        </nav>
      ) : null}

      {!q ? (
        <EmptyState icon={Search} title="Search the community" description="Type at least 2 characters to search across the batch." />
      ) : !results ? (
        <EmptyState icon={Search} title="Keep typing" description="Search terms need at least 2 characters." />
      ) : total === 0 ? (
        <EmptyState icon={Search} title={`No results for “${results.q}”`} description="Check the spelling or try a broader term." />
      ) : (
        <div className="space-y-8">
          <Section title="Pages" icon={Search} count={pages.length}>
            <ul className="flex flex-wrap gap-2">
              {pages.map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className={cn(buttonVariants({ variant: "outline" }), "gap-2")}>
                    <p.icon aria-hidden /> {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Students" icon={Users} count={results.studentTotal} moreHref={`/directory?q=${encodeURIComponent(results.q)}`}>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.students.map((s) => (
                <li key={s.userId}>
                  <StudentCard student={s} layout="list" />
                </li>
              ))}
            </ul>
          </Section>
          <Section title="Posts" icon={MessagesSquare} count={results.posts.length} moreHref={more("posts")}>
            <ul className="grid gap-2">
              {results.posts.map((p) => (
                <ResultLink
                  key={p.id}
                  href={`/feed/${p.id}`}
                  title={p.content}
                  meta={`${POST_TYPE_LABELS[p.type]} · ${p.author.name} · ${formatRelative(p.createdAt)}`}
                />
              ))}
            </ul>
          </Section>
          <Section title="Projects" icon={FolderGit2} count={results.projects.length} moreHref={more("projects")}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {results.projects.map((p) => (
                <ResultLink key={p.id} href={`/projects/${p.id}`} title={p.title} meta={`${PROJECT_CATEGORY_LABELS[p.category]} · ${p.technologies.slice(0, 3).join(", ")}`} />
              ))}
            </ul>
          </Section>
          <Section title="Opportunities" icon={Briefcase} count={results.opportunities.length} moreHref={more("opportunities")}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {results.opportunities.map((o) => (
                <ResultLink
                  key={o.id}
                  href={`/opportunities?q=${encodeURIComponent(o.title)}`}
                  title={o.title}
                  meta={`${OPPORTUNITY_TYPE_LABELS[o.type]} · ${o.organization}${o.deadline ? ` · due ${formatDate(o.deadline)}` : ""}`}
                />
              ))}
            </ul>
          </Section>
          <Section title="Resources" icon={BookOpen} count={results.resources.length} moreHref={more("resources")}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {results.resources.map((r) => (
                <ResultLink key={r.id} href={`/resources?q=${encodeURIComponent(r.title)}`} title={r.title} meta={`${r.course} · ${RESOURCE_CATEGORY_LABELS[r.category]}`} />
              ))}
            </ul>
          </Section>
          <Section title="Events" icon={CalendarDays} count={results.events.length} moreHref={more("events")}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {results.events.map((e) => (
                <ResultLink key={e.id} href={`/events/${e.id}`} title={e.title} meta={`${EVENT_TYPE_LABELS[e.type]} · ${formatDate(e.startsAt)} · ${e.location}`} />
              ))}
            </ul>
          </Section>
          <Section title="Announcements" icon={Megaphone} count={results.announcements.length} moreHref={more("announcements")}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {results.announcements.map((a) => (
                <ResultLink key={a.id} href={`/announcements/${a.id}`} title={a.title} meta={`${ANNOUNCEMENT_CATEGORY_LABELS[a.category]} · ${formatDate(a.createdAt)}`} />
              ))}
            </ul>
          </Section>
        </div>
      )}
    </>
  );
}
