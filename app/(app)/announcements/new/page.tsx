import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/shared/page-header";
import { AnnouncementForm } from "@/components/announcements/announcement-form";

export const metadata: Metadata = { title: "New announcement" };

export default async function NewAnnouncementPage() {
  await requirePermission("announcements.manage");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New announcement" description="Everyone in the batch gets a notification when you publish." />
      <AnnouncementForm />
    </div>
  );
}
