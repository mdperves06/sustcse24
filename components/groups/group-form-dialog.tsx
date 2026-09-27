"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { useActionForm } from "@/hooks/use-action-form";
import { createGroupAction, updateGroupAction } from "@/actions/groups";

type Existing = { id: string; name: string; description: string; icon: string | null };

/**
 * Create (staff) or edit a group. `descriptionOnly` is for group managers, who may only
 * change the description — the server enforces the same rule.
 */
export function GroupFormDialog({ group, descriptionOnly = false }: { group?: Existing; descriptionOnly?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const editing = Boolean(group);
  const { state, pending, fieldError, formProps } = useActionForm(editing ? updateGroupAction : createGroupAction, {
    resetOnSuccess: !editing,
    onSuccess: (data) => {
      setOpen(false);
      if (!editing && data?.slug) router.push(`/groups/${data.slug}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button variant="outline" size="sm">
            <Pencil aria-hidden /> {descriptionOnly ? "Edit description" : "Edit group"}
          </Button>
        ) : (
          <Button>
            <Plus aria-hidden /> New group
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? (descriptionOnly ? "Edit description" : "Edit group") : "Create a group"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Changes are visible to everyone in the batch."
              : "The group's link is generated from its name. Members can join and post straight away."}
          </DialogDescription>
        </DialogHeader>
        <form {...formProps} className="space-y-4">
          {group ? <input type="hidden" name="groupId" value={group.id} /> : null}
          <FormAlert message={!state.ok && !state.fieldErrors ? state.error : null} />
          {descriptionOnly ? null : (
            <div className="grid grid-cols-[5rem_1fr] gap-3">
              <FormField label="Icon" name="icon" hint="One emoji" error={fieldError("icon")}>
                {(f) => <Input {...f} defaultValue={group?.icon ?? ""} maxLength={16} placeholder="🤖" className="text-center text-lg" />}
              </FormField>
              <FormField label="Name" name="name" error={fieldError("name")} required>
                {(f) => <Input {...f} defaultValue={group?.name} required minLength={2} maxLength={60} placeholder="e.g. Data Science" />}
              </FormField>
            </div>
          )}
          <FormField label="Description" name="description" error={fieldError("description")} required>
            {(f) => (
              <Textarea
                {...f}
                defaultValue={group?.description}
                required
                maxLength={1000}
                rows={4}
                placeholder="What is this group about? Who should join?"
              />
            )}
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <SubmitButton pending={pending}>{editing ? "Save changes" : "Create group"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
