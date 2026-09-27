import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectForm } from "@/components/projects/project-form";

export const metadata: Metadata = { title: "Add project" };

export default async function NewProjectPage() {
  const viewer = await requireUser();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Add a project" description="Showcase something you built — solo or with batchmates." />
      <ProjectForm author={{ roll: viewer.roll, name: viewer.fullName, avatarKey: viewer.avatarKey }} />
    </div>
  );
}
