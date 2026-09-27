import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/current-user";
import { getAnnouncement } from "@/services/announcements";
import { NotFoundError } from "@/lib/errors";
import { toLocalInputValue } from "@/lib/time";
import { PageHeader } from "@/components/shared/page-header";
import { AnnouncementForm } from "@/components/announcements/announcement-form";

export const metadata: Metadata = { title: "Edit announcement" };

export default async function EditAnnouncementPage({ params }: PageProps<"/announcements/[id]/edit">) {
  const viewer = await requirePermission("announcements.manage");
  const { id } = await params;
  const a = await getAnnouncement(viewer, id).catch((e: unknown) => {
    if (e instanceof NotFoundError) notFound();
    throw e;
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit announcement" description="Changes are visible immediately. No new notification is sent." />
      <AnnouncementForm
        initial={{
          id: a.id,
          title: a.title,
          body: a.body,
          category: a.category,
          priority: a.priority,
          pinned: a.pinned,
          expiresAt: toLocalInputValue(a.expiresAt),
          attachmentName: a.attachmentKey ? (a.attachmentName ?? "Attachment") : null,
        }}
      />
    </div>
  );
}
