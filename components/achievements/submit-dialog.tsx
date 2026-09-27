"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { useActionForm } from "@/hooks/use-action-form";
import { submitAchievementAction } from "@/actions/achievements";
import { ACHIEVEMENT_CATEGORY_LABELS, options } from "@/lib/labels";

export function SubmitAchievementDialog({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const { state, pending, fieldError, formProps } = useActionForm(submitAchievementAction, {
    resetOnSuccess: true,
    onSuccess: () => setOpen(false),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden /> Submit achievement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit an achievement</DialogTitle>
          <DialogDescription>
            A moderator verifies each submission before it appears in the Hall of Fame. Add a proof link to speed things up.
          </DialogDescription>
        </DialogHeader>
        <form {...formProps} className="space-y-4">
          <FormAlert message={!state.ok ? state.error : null} />
          <FormField label="Title" name="title" error={fieldError("title")} required>
            {(f) => <Input {...f} required maxLength={160} placeholder="e.g. 2nd place — NASA Space Apps Sylhet" />}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Category" name="category" error={fieldError("category")} required>
              {(f) => (
                <NativeSelect {...f} required defaultValue="HACKATHON" className="w-full">
                  {options(ACHIEVEMENT_CATEGORY_LABELS).map((o) => (
                    <NativeSelectOption key={o.value} value={o.value}>
                      {o.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </FormField>
            <FormField label="Date achieved" name="achievedOn" error={fieldError("achievedOn")}>
              {(f) => <Input {...f} type="date" max={today} />}
            </FormField>
          </div>
          <FormField label="Proof link" name="link" error={fieldError("link")} hint="Certificate, result page, paper or news article">
            {(f) => <Input {...f} type="url" placeholder="https://…" />}
          </FormField>
          <FormField label="Description" name="description" error={fieldError("description")}>
            {(f) => <Textarea {...f} rows={4} maxLength={3000} placeholder="Tell the batch a little about it — team, event, what you built…" />}
          </FormField>
          <div className="flex justify-end">
            <SubmitButton pending={pending} pendingText="Submitting…">
              Submit for review
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
