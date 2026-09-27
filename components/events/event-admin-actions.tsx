"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { deleteEventAction } from "@/actions/events";

export function EventAdminActions({ id }: { id: string }) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/events/${id}/edit`}>
          <Pencil aria-hidden /> Edit
        </Link>
      </Button>
      <ConfirmAction
        title="Delete this event?"
        description="The event and its RSVPs will be hidden from everyone."
        confirmLabel="Delete event"
        action={() => deleteEventAction(id)}
        onDone={() => router.push("/events")}
        trigger={
          <Button variant="destructive" size="sm">
            <Trash2 aria-hidden /> Delete
          </Button>
        }
      />
    </div>
  );
}
