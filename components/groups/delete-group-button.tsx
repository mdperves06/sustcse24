"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feed/confirm-dialog";
import { deleteGroupAction } from "@/actions/groups";

export function DeleteGroupButton({ groupId, groupName }: { groupId: string; groupName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 aria-hidden /> Delete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete ${groupName}?`}
        description="The group and its discussion will be hidden from everyone. This is recorded in the audit log."
        confirmLabel="Delete group"
        action={() => deleteGroupAction(groupId)}
        onDone={() => {
          router.push("/groups");
          router.refresh();
        }}
      />
    </>
  );
}
