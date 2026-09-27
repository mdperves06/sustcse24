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
import { TagInput } from "@/components/shared/tag-input";
import { useActionForm } from "@/hooks/use-action-form";
import { createTeammateRequestAction } from "@/actions/teammates";
import { CONTACT_PREFERENCE_LABELS, options } from "@/lib/labels";

export function TeammateRequestDialog({ skillSuggestions }: { skillSuggestions: string[] }) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { state, pending, fieldError, formProps } = useActionForm(createTeammateRequestAction, {
    onSuccess: () => {
      setOpen(false);
      setFormKey((k) => k + 1); // remount to clear the tag input as well
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden /> Post a request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Find teammates</DialogTitle>
          <DialogDescription>Describe your idea and the skills you need — matching batchmates will see how they fit.</DialogDescription>
        </DialogHeader>
        <form key={formKey} {...formProps} className="space-y-4">
          <FormAlert message={!state.ok ? state.error : null} />
          <FormField label="Project idea" name="title" error={fieldError("title")} required>
            {(f) => <Input {...f} required maxLength={160} placeholder="e.g. Hackathon team: AI study planner" />}
          </FormField>
          <FormField label="Description" name="description" error={fieldError("description")} required>
            {(f) => <Textarea {...f} required rows={4} maxLength={3000} placeholder="What are you building, for which event, and what's the time commitment?" />}
          </FormField>
          <FormField label="Required skills" name="requiredSkills" error={fieldError("requiredSkills")} hint="Press Enter after each skill" required>
            {(f) => <TagInput {...f} suggestions={skillSuggestions} max={12} placeholder="e.g. React, AI/ML, Figma" />}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Teammates needed" name="teammatesNeeded" error={fieldError("teammatesNeeded")} required>
              {(f) => <Input {...f} type="number" min={1} max={10} defaultValue={1} required inputMode="numeric" />}
            </FormField>
            <FormField label="Deadline" name="deadline" error={fieldError("deadline")} hint="Optional">
              {(f) => <Input {...f} type="date" />}
            </FormField>
          </div>
          <FormField
            label="How should people contact you?"
            name="contactPreference"
            error={fieldError("contactPreference")}
            hint="Email, phone and social links are only shown if your privacy settings share them with the batch."
            required
          >
            {(f) => (
              <NativeSelect {...f} defaultValue="IN_APP" className="w-full">
                {options(CONTACT_PREFERENCE_LABELS).map((o) => (
                  <NativeSelectOption key={o.value} value={o.value}>
                    {o.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <div className="flex justify-end">
            <SubmitButton pending={pending} pendingText="Posting…">
              Post request
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
