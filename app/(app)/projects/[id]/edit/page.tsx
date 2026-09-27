import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectForm } from "@/components/projects/project-form";
import { loadProject } from "../load";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProjectPage({ params }: PageProps<"/projects/[id]/edit">) {
  const viewer = await requireUser();
  const { id } = await params;
  const p = await loadProject(viewer, id);
  if (!p.canEdit) redirect(`/projects/${p.id}`);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit project" description={p.title} />
      <ProjectForm
        author={{ roll: viewer.roll, name: viewer.fullName, avatarKey: viewer.avatarKey }}
        defaults={{
          id: p.id,
          title: p.title,
          description: p.description,
          category: p.category,
          technologies: p.technologies,
          githubUrl: p.githubUrl,
          demoUrl: p.demoUrl,
          images: p.images.map((i) => ({ id: i.id, key: i.key })),
          members: p.members
            .filter((m) => !m.isAuthor)
            .map((m) => ({ roll: m.roll, name: m.name, avatarKey: m.avatarKey, role: m.memberRole })),
        }}
      />
    </div>
  );
}
