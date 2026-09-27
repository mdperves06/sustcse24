"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Loader2, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { useServerAction } from "@/hooks/use-action-form";
import {
  deleteAnnouncementAction,
  setAnnouncementArchivedAction,
  setAnnouncementPinnedAction,
} from "@/actions/announcements";

export function AnnouncementAdminActions({ id, pinned, archived }: { id: string; pinned: boolean; archived: boolean }) {
  const router = useRouter();
  const pin = useServerAction();
  const archive = useServerAction();

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link href={`/announcements/${id}/edit`}>
          <Pencil aria-hidden /> Edit
        </Link>
      </Button>
      {!archived ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pin.pending}
          aria-pressed={pinned}
          onClick={() => pin.run(() => setAnnouncementPinnedAction(id, !pinned))}
        >
          {pin.pending ? <Loader2 className="animate-spin" aria-hidden /> : pinned ? <PinOff aria-hidden /> : <Pin aria-hidden />}
          {pinned ? "Unpin" : "Pin"}
        </Button>
      ) : null}
      <Button
        variant="outline"
        size="sm"
        disabled={archive.pending}
        onClick={() => archive.run(() => setAnnouncementArchivedAction(id, !archived))}
      >
        {archive.pending ? (
          <Loader2 className="animate-spin" aria-hidden />
        ) : archived ? (
          <ArchiveRestore aria-hidden />
        ) : (
          <Archive aria-hidden />
        )}
        {archived ? "Restore" : "Archive"}
      </Button>
      <ConfirmAction
        title="Delete this announcement?"
        description="It will be removed for everyone. This can't be undone from the app."
        confirmLabel="Delete"
        action={() => deleteAnnouncementAction(id)}
        onDone={() => router.push("/announcements")}
        trigger={
          <Button variant="destructive" size="sm">
            <Trash2 aria-hidden /> Delete
          </Button>
        }
      />
    </div>
  );
}
