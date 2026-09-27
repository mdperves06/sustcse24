import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Award,
  BadgeCheck,
  Cake,
  Droplet,
  ExternalLink,
  FileText,
  FolderGit2,
  Globe,
  IdCard,
  Lock,
  Mail,
  MapPin,
  Pencil,
  Phone,
} from "lucide-react";
import { requireUser } from "@/lib/auth/current-user";
import { getProfileActivity, getProfileByRoll } from "@/services/profiles";
import { NotFoundError } from "@/lib/errors";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SocialIcon } from "@/components/students/social-icon";
import {
  ACHIEVEMENT_CATEGORY_LABELS,
  BLOOD_GROUP_LABELS,
  EMPLOYMENT_LABELS,
  PROJECT_CATEGORY_LABELS,
  ROLE_LABELS,
} from "@/lib/labels";
import { formatDate, formatMonthDay } from "@/lib/time";
import { fileUrl } from "@/lib/files";

export const metadata: Metadata = { title: "Student profile" };

async function loadProfile(viewer: { id: string; role: "STUDENT" | "MODERATOR" | "ADMIN" }, roll: string) {
  try {
    return await getProfileByRoll(viewer, decodeURIComponent(roll));
  } catch (e) {
    if (e instanceof NotFoundError) notFound();
    throw e;
  }
}

function InfoRow({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm font-medium break-words">{children}</div>
      </div>
    </div>
  );
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Not added yet.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((t) => (
        <Badge key={t} variant="secondary">
          {t}
        </Badge>
      ))}
    </div>
  );
}

export default async function StudentProfilePage({ params }: PageProps<"/students/[roll]">) {
  const viewer = await requireUser();
  const { roll } = await params;
  const p = await loadProfile(viewer, roll);
  const activity = await getProfileActivity(p.userId);

  const socials = [
    { kind: "github" as const, url: p.githubUrl, label: "GitHub" },
    { kind: "linkedin" as const, url: p.linkedinUrl, label: "LinkedIn" },
    { kind: "facebook" as const, url: p.facebookUrl, label: "Facebook" },
    { kind: "portfolio" as const, url: p.portfolioUrl, label: "Portfolio" },
  ].filter((s) => s.url);
  const allSkills = [...p.skills.LANGUAGE, ...p.skills.FRAMEWORK, ...p.skills.TOOL, ...p.skills.OTHER];

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
        <div className="bg-brand-gradient h-28 sm:h-36" aria-hidden />
        <div className="px-5 pb-5 sm:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <UserAvatar name={p.fullName} avatarKey={p.avatarKey} size="xl" className="ring-4 ring-card sm:size-28" />
              <div className="sm:pb-1">
                <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
                  {p.fullName}
                  {p.isVerified ? <BadgeCheck className="size-5 text-primary" aria-label="Verified profile" /> : null}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {p.nickname ? `“${p.nickname}” · ` : ""}
                  <span className="font-mono">{p.roll}</span> · {p.batch}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.role !== "STUDENT" ? <Badge>{ROLE_LABELS[p.role]}</Badge> : null}
                  <Badge variant="outline">{EMPLOYMENT_LABELS[p.employmentStatus]}</Badge>
                  {p.location ? (
                    <Badge variant="outline">
                      <MapPin aria-hidden /> {p.location}
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {p.cvKey ? (
                <Button variant="outline" size="sm" asChild>
                  <a href={fileUrl(p.cvKey)!} target="_blank" rel="noopener">
                    <FileText aria-hidden /> View CV
                  </a>
                </Button>
              ) : null}
              {p.isOwner ? (
                <>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/id-card">
                      <IdCard aria-hidden /> Digital ID
                    </Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/profile/edit">
                      <Pencil aria-hidden /> Edit profile
                    </Link>
                  </Button>
                </>
              ) : null}
            </div>
          </div>
          {p.bio ? <p className="mt-4 max-w-3xl text-sm leading-relaxed">{p.bio}</p> : null}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Contact & details</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              {p.email ? (
                <InfoRow icon={Mail} label="Email">
                  <a href={`mailto:${p.email}`} className="hover:underline">
                    {p.email}
                  </a>
                </InfoRow>
              ) : null}
              {p.phone ? (
                <InfoRow icon={Phone} label="Phone">
                  <a href={`tel:${p.phone}`} className="hover:underline">
                    {p.phone}
                  </a>
                </InfoRow>
              ) : null}
              {p.birthday ? (
                <InfoRow icon={Cake} label="Birthday">
                  {formatMonthDay(new Date(Date.UTC(2000, p.birthday.month - 1, p.birthday.day)))}
                </InfoRow>
              ) : null}
              {p.bloodGroup ? (
                <InfoRow icon={Droplet} label="Blood group">
                  {BLOOD_GROUP_LABELS[p.bloodGroup]}
                </InfoRow>
              ) : null}
              <InfoRow icon={Globe} label="Department">
                {p.department}
              </InfoRow>
              {!p.email && !p.phone && !p.birthday && !p.bloodGroup ? (
                <p className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
                  <Lock className="size-3.5" aria-hidden /> Contact details are private.
                </p>
              ) : null}
            </CardContent>
          </Card>

          {socials.length || p.otherLinks.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {socials.map((s) => (
                  <a
                    key={s.kind}
                    href={s.url!}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted"
                  >
                    <SocialIcon kind={s.kind} className="size-4 text-muted-foreground" />
                    <span className="flex-1 font-medium">{s.label}</span>
                    <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
                  </a>
                ))}
                {p.otherLinks.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted"
                  >
                    <Globe className="size-4 text-muted-foreground" aria-hidden />
                    <span className="flex-1 font-medium">{l.label}</span>
                    <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
                  </a>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {p.currentOrganization || p.position || p.industry || p.careerInterests.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Career</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {p.position || p.currentOrganization ? (
                  <p className="font-medium">
                    {p.position}
                    {p.position && p.currentOrganization ? " at " : ""}
                    {p.currentOrganization}
                  </p>
                ) : null}
                {p.industry ? <p className="text-muted-foreground">Industry: {p.industry}</p> : null}
                {p.careerInterests.length ? (
                  <div>
                    <p className="mb-1.5 text-xs text-muted-foreground">Career interests</p>
                    <TagList items={p.careerInterests} />
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {allSkills.length === 0 ? <p className="text-sm text-muted-foreground">No skills added yet.</p> : null}
              {(
                [
                  ["Programming languages", p.skills.LANGUAGE],
                  ["Frameworks", p.skills.FRAMEWORK],
                  ["Tools", p.skills.TOOL],
                  ["Other skills", p.skills.OTHER],
                ] as const
              ).map(([label, items]) =>
                items.length ? (
                  <div key={label}>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
                    <TagList items={items} />
                  </div>
                ) : null,
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Interests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <TagList items={[...new Set([...p.interests, ...p.academicInterests])]} />
                {p.hobbies.length ? (
                  <div>
                    <p className="mb-1.5 text-xs text-muted-foreground">Hobbies</p>
                    <TagList items={p.hobbies} />
                  </div>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                {p.certifications.length ? (
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {p.certifications.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">None listed.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="size-4 text-primary" aria-hidden /> Verified achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activity.achievements.length ? (
                <ul className="space-y-3">
                  {activity.achievements.map((a) => (
                    <li key={a.id} className="flex items-start gap-3">
                      <BadgeCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-label="Verified" />
                      <div>
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {ACHIEVEMENT_CATEGORY_LABELS[a.category]}
                          {a.achievedOn ? ` · ${formatDate(a.achievedOn)}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No verified achievements yet.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderGit2 className="size-4 text-primary" aria-hidden /> Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activity.projects.length ? (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {activity.projects.map((pr) => (
                    <li key={pr.id}>
                      <Link href={`/projects/${pr.id}`} className="block rounded-xl border p-3 transition-colors hover:border-primary/30 hover:bg-accent/40">
                        <p className="text-sm font-medium">{pr.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {PROJECT_CATEGORY_LABELS[pr.category]} · {pr._count.likes} like{pr._count.likes === 1 ? "" : "s"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {pr.technologies.slice(0, 3).map((t) => (
                            <Badge key={t} variant="outline">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No projects yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
