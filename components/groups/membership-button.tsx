"use client";

import { useState } from "react";
import { Check, Loader2, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/feed/confirm-dialog";
import { useServerAction } from "@/hooks/use-action-form";
import { joinGroupAction, leaveGroupAction } from "@/actions/groups";

export function MembershipButton({
  groupId,
  groupName,
  joined,
  isManager = false,
  size = "sm",
  className,
}: {
  groupId: string;
  groupName: string;
  joined: boolean;
  isManager?: boolean;
  size?: "sm" | "default";
  className?: string;
}) {
  const { pending, run } = useServerAction();
  const [confirmLeave, setConfirmLeave] = useState(false);

  if (!joined) {
    return (
      <Button size={size} className={className} disabled={pending} onClick={() => run(() => joinGroupAction(groupId))} aria-label={`Join ${groupName}`}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
        Join
      </Button>
    );
  }

  return (
    <>
      <Button
        size={size}
        variant="outline"
        className={className}
        disabled={pending}
        onClick={() => setConfirmLeave(true)}
        aria-label={`Leave ${groupName}`}
      >
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
        Joined
        <LogOut className="opacity-60" aria-hidden />
      </Button>
      <ConfirmDialog
        open={confirmLeave}
        onOpenChange={setConfirmLeave}
        title={`Leave ${groupName}?`}
        description={
          isManager
            ? "You're a manager of this group. Leaving removes your manager role; staff would need to promote you again."
            : "You can rejoin any time. Your posts in the group stay."
        }
        confirmLabel="Leave group"
        action={() => leaveGroupAction(groupId)}
      />
    </>
  );
}
