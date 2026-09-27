"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmAction } from "@/components/shared/confirm-action";
import { deleteProjectAction } from "@/actions/projects";

export function DeleteProjectButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  return (
    <ConfirmAction
      title="Delete this project?"
      description={`“${title}” will be removed from the gallery for everyone.`}
      confirmLabel="Delete project"
      action={() => deleteProjectAction(id)}
      onDone={() => router.push("/projects")}
      trigger={
        <Button variant="destructive">
          <Trash2 aria-hidden /> Delete
        </Button>
      }
    />
  );
}
