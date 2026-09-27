import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/current-user";
import { PageHeader } from "@/components/shared/page-header";
import { EventForm } from "@/components/events/event-form";

export const metadata: Metadata = { title: "New event" };

export default async function NewEventPage() {
  await requirePermission("events.manage");
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New event" description="The whole batch is notified. Times are in Bangladesh time (GMT+6)." />
      <EventForm />
    </div>
  );
}
