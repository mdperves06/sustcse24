"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
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
import { createOpportunityAction, updateOpportunityAction } from "@/actions/opportunities";
import { OPPORTUNITY_TYPE_LABELS, options } from "@/lib/labels";
import type { ActionResult } from "@/types/action";

export type OpportunityDefaults = {
  id: string;
  title: string;
  organization: string;
  description: string;
  type: string;
  location: string | null;
  /** YYYY-MM-DD (Dhaka) */
  deadline: string;
  applyUrl: string | null;
};

function OpportunityFields({
  action,
  defaults,
  submitLabel,
  onDone,
}: {
  action: (prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  defaults?: OpportunityDefaults;
  submitLabel: string;
  onDone: () => void;
}) {
  const { state, pending, fieldError, formProps } = useActionForm(action, {
    resetOnSuccess: !defaults,
    onSuccess: onDone,
  });

  return (
    <form {...formProps} className="space-y-4">
      <FormAlert message={!state.ok ? state.error : null} />
      <FormField label="Title" name="title" error={fieldError("title")} required>
        {(f) => <Input {...f} required maxLength={160} defaultValue={defaults?.title} placeholder="e.g. Software Engineering Intern (Summer)" />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Organization" name="organization" error={fieldError("organization")} required>
          {(f) => <Input {...f} required maxLength={120} defaultValue={defaults?.organization} placeholder="Company, lab or organizer" />}
        </FormField>
        <FormField label="Type" name="type" error={fieldError("type")} required>
          {(f) => (
            <NativeSelect {...f} required defaultValue={defaults?.type ?? "INTERNSHIP"} className="w-full">
              {options(OPPORTUNITY_TYPE_LABELS).map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField label="Location" name="location" error={fieldError("location")} hint="City, Remote or Hybrid">
          {(f) => <Input {...f} maxLength={120} defaultValue={defaults?.location ?? ""} placeholder="Dhaka / Remote" />}
        </FormField>
        <FormField label="Deadline" name="deadline" error={fieldError("deadline")} hint="Leave empty for rolling applications">
          {(f) => <Input {...f} type="date" defaultValue={defaults?.deadline ?? ""} />}
        </FormField>
      </div>
      <FormField label="Application link" name="applyUrl" error={fieldError("applyUrl")}>
        {(f) => <Input {...f} type="url" defaultValue={defaults?.applyUrl ?? ""} placeholder="https://…" />}
      </FormField>
      <FormField label="Description" name="description" error={fieldError("description")} required>
        {(f) => (
          <Textarea
            {...f}
            required
            rows={6}
            maxLength={5000}
            defaultValue={defaults?.description}
            placeholder="Eligibility, stipend, how to apply, who to contact…"
          />
        )}
      </FormField>
      <div className="flex justify-end">
        <SubmitButton pending={pending}>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

export function CreateOpportunityDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden /> Post opportunity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Post an opportunity</DialogTitle>
          <DialogDescription>Share an internship, job, hackathon or scholarship with the batch.</DialogDescription>
        </DialogHeader>
        <OpportunityFields action={createOpportunityAction} submitLabel="Post opportunity" onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export function EditOpportunityDialog({ defaults }: { defaults: OpportunityDefaults }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${defaults.title}`}>
          <Pencil aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit opportunity</DialogTitle>
        </DialogHeader>
        <OpportunityFields
          action={updateOpportunityAction.bind(null, defaults.id)}
          defaults={defaults}
          submitLabel="Save changes"
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
