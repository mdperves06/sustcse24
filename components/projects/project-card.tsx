import Image from "next/image";
import Link from "next/link";
import { Bookmark, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MemberAvatars } from "@/components/projects/member-avatars";
import { PROJECT_CATEGORY_META } from "@/components/projects/category-meta";
import { PROJECT_CATEGORY_LABELS } from "@/lib/labels";
import { fileUrl } from "@/lib/files";
import { cn } from "@/lib/utils";
import type { ProjectCard as Card } from "@/services/projects";

export function ProjectCover({
  coverKey,
  category,
  title,
  className,
}: {
  coverKey: string | null;
  category: Card["category"];
  title: string;
  className?: string;
}) {
  const meta = PROJECT_CATEGORY_META[category];
  const Icon = meta.icon;
  const src = fileUrl(coverKey);
  return (
    <div className={cn("relative aspect-[16/9] overflow-hidden bg-muted", className)}>
      {src ? (
        <Image
          src={src}
          alt={`Screenshot of ${title}`}
          fill
          unoptimized
          sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div className={cn("flex h-full items-center justify-center bg-gradient-to-br", meta.gradient)}>
          <Icon className="size-12 text-foreground/40" aria-hidden />
        </div>
      )}
    </div>
  );
}

export function ProjectCard({ project: p }: { project: Card }) {
  return (
    <Link
      href={`/projects/${p.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <div className="relative">
        <ProjectCover coverKey={p.coverKey} category={p.category} title={p.title} />
        <Badge className="absolute top-3 left-3 bg-background/85 text-foreground shadow-sm backdrop-blur">
          {PROJECT_CATEGORY_LABELS[p.category]}
        </Badge>
        {p.bookmarked ? (
          <span className="absolute top-3 right-3 flex size-7 items-center justify-center rounded-full bg-background/85 text-primary shadow-sm backdrop-blur">
            <Bookmark className="size-3.5 fill-current" aria-label="Bookmarked" />
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-1 font-semibold">{p.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.excerpt}</p>
        {p.technologies.length ? (
          <div className="mt-3 flex flex-wrap gap-1">
            {p.technologies.slice(0, 4).map((t) => (
              <Badge key={t} variant="secondary">
                {t}
              </Badge>
            ))}
            {p.technologies.length > 4 ? <Badge variant="outline">+{p.technologies.length - 4}</Badge> : null}
          </div>
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-4">
          <MemberAvatars members={p.members} />
          <span className={cn("inline-flex items-center gap-1 text-sm tabular-nums", p.liked ? "text-destructive" : "text-muted-foreground")}>
            <Heart className={cn("size-4", p.liked && "fill-current")} aria-hidden />
            {p.likeCount}
            <span className="sr-only"> like{p.likeCount === 1 ? "" : "s"}</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
