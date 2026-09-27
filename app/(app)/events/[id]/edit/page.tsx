import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/current-user";
import { getEventForEdit } from "@/services/events";
import { NotFoundError } from "@/lib/errors";
import { toLocalInputValue } from "@/lib/time";
import { PageHeader } from "@/components/shared/page-header";
import { EventForm } from "@/components/events/event-form";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: PageProps<"/events/[id]/edit">) {
  const viewer = await requirePermission("events.manage");
  const { id } = await params;
  const e = await getEventForEdit(viewer, id).catch((err: unknown) => {
    if (err instanceof NotFoundError) notFound();
    throw err;
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Edit event" description="Existing RSVPs are kept. Times are in Bangladesh time (GMT+6)." />
      <EventForm
        initial={{
          id: e.id,
          title: e.title,
          description: e.description,
          type: e.type,
          startsAt: toLocalInputValue(e.startsAt),
          endsAt: toLocalInputValue(e.endsAt),
          registrationDeadline: toLocalInputValue(e.registrationDeadline),
          location: e.location,
          organizer: e.organizer,
          hasCover: Boolean(e.coverKey),
        }}
      />
    </div>
  );
}
