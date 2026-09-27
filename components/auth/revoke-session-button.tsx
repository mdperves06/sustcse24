"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerAction } from "@/hooks/use-action-form";
import { revokeSessionAction } from "@/actions/auth";

export function RevokeSessionButton({ sessionId }: { sessionId: string }) {
  const { pending, run } = useServerAction();
  return (
    <Button variant="outline" size="sm" disabled={pending} onClick={() => run(() => revokeSessionAction(sessionId))}>
      <LogOut aria-hidden /> Sign out
    </Button>
  );
}
