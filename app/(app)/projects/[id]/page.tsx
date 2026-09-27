import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichText } from "@/components/shared/rich-text";
import { UserAvatar } from "@/components/shared/user-avatar";
import { SocialIcon } from "@/components/students/social-icon";
import { ProjectCover } from "@/components/projects/project-card";
import { ScreenshotGallery } from "@/components/projects/screenshot-gallery";
import { ProjectBookmarkButton, ProjectLikeButton } from "@/components/projects/project-toggles";
import { DeleteProjectButton } from "@/components/projects/delete-project-button";
import { PROJECT_CATEGORY_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import { loadProject } from "./load";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  const viewer = await requireUser();
  const { id } = await params;
  const p = await loadProject(viewer, id);

  return (
    <div className="space-y-6">
      <Link href="/projects" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Project Gallery
      </Link>

      <section className="rounded-2xl border bg-card p-5 shadow-xs sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              <Link href={`/projects?category=${p.category}`}>
                <Badge>{PROJECT_CATEGORY_LABELS[p.category]}</Badge>
              </Link>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{p.title}</h1>
            <p className="text-sm text-muted-foreground">
              By{" "}
              <Link href={`/students/${encodeURIComponent(p.author.roll)}`} className="font-medium text-foreground hover:underline">
                {p.author.name}
              </Link>{" "}
              · {formatDate(p.createdAt)}
              {p.updatedAt.getTime() - p.createdAt.getTime() > 60_000 ? ` · updated ${formatDate(p.updatedAt)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ProjectLikeButton id={p.id} liked={p.liked} likeCount={p.likeCount} />
            <ProjectBookmarkButton id={p.id} bookmarked={p.bookmarked} />
            {p.canEdit ? (
              <Button variant="outline" asChild>
                <Link href={`/projects/${p.id}/edit`}>
                  <Pencil aria-hidden /> Edit
                </Link>
              </Button>
            ) : null}
            {p.canDelete ? <DeleteProjectButton id={p.id} title={p.title} /> : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {p.images.length ? (
            <ScreenshotGallery images={p.images} title={p.title} />
          ) : (
            <ProjectCover coverKey={null} category={p.category} title={p.title} className="rounded-2xl border" />
          )}
          <Card>
            <CardHeader>
              <CardTitle>About</CardTitle>
            </CardHeader>
            <CardContent>
              <RichText text={p.description} className="text-base" />
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          {p.githubUrl || p.demoUrl ? (
            <Card>
              <CardHeader>
                <CardTitle>Links</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {p.demoUrl ? (
                  <Button asChild>
                    <a href={p.demoUrl} target="_blank" rel="noopener noreferrer nofollow">
                      <ExternalLink aria-hidden /> Live demo
                    </a>
                  </Button>
                ) : null}
                {p.githubUrl ? (
                  <Button variant="outline" asChild>
                    <a href={p.githubUrl} target="_blank" rel="noopener noreferrer nofollow">
                      <SocialIcon kind="github" className="size-4" /> Source code
                    </a>
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          {p.technologies.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Built with</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-1.5">
                {p.technologies.map((t) => (
                  <Link key={t} href={`/projects?tech=${encodeURIComponent(t)}`}>
                    <Badge variant="secondary">{t}</Badge>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Team · {p.members.length}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {p.members.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/students/${encodeURIComponent(m.roll)}`}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
                    >
                      <UserAvatar name={m.name} avatarKey={m.avatarKey} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{m.name}</span>
                        <span className="block font-mono text-xs text-muted-foreground">{m.roll}</span>
                      </span>
                      {m.memberRole ? <Badge variant={m.isAuthor ? "default" : "outline"}>{m.memberRole}</Badge> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
