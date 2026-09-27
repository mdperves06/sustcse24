"use client";

import { useState } from "react";
import { MoreHorizontal, ShieldCheck, ShieldOff, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/feed/confirm-dialog";
import { useServerAction } from "@/hooks/use-action-form";
import { removeMemberAction, setMemberRoleAction } from "@/actions/groups";

/** Staff-only member controls (the server re-checks "groups.manage"). */
export function MemberMenu({
  groupId,
  member,
}: {
  groupId: string;
  member: { id: string; name: string; groupRole: "MEMBER" | "MANAGER" };
}) {
  const { pending, run } = useServerAction();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const manager = member.groupRole === "MANAGER";

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-xs" aria-label={`Manage ${member.name}`} disabled={pending}>
            <MoreHorizontal aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onSelect={() => run(() => setMemberRoleAction(groupId, member.id, manager ? "MEMBER" : "MANAGER"))}>
            {manager ? <ShieldOff aria-hidden /> : <ShieldCheck aria-hidden />}
            {manager ? "Remove manager role" : "Make manager"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmRemove(true)}>
            <UserMinus aria-hidden /> Remove from group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Remove ${member.name}?`}
        description="They can rejoin later unless the issue is handled another way. This is recorded in the audit log."
        confirmLabel="Remove"
        action={() => removeMemberAction(groupId, member.id)}
      />
    </>
  );
}
