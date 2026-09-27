"use client";

import { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { useActionForm } from "@/hooks/use-action-form";
import { createPollAction } from "@/actions/polls";
import { POLL_MAX_OPTIONS, POLL_MIN_OPTIONS } from "@/lib/validation/polls";

let nextKey = 0;
const blankOptions = () => Array.from({ length: POLL_MIN_OPTIONS }, () => ({ key: nextKey++ }));

function ToggleField({ id, name, label, hint }: { id: string; name: string; label: string; hint: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
      <div>
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      </div>
      <Switch id={id} name={name} value="true" aria-describedby={`${id}-hint`} />
    </div>
  );
}

export function CreatePollDialog() {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState(blankOptions);
  const listRef = useRef<HTMLOListElement>(null);
  const { state, pending, fieldError, formProps } = useActionForm(createPollAction, {
    resetOnSuccess: true,
    onSuccess: () => {
      setOpen(false);
      setOpts(blankOptions());
    },
  });

  function addOption() {
    setOpts((o) => [...o, { key: nextKey++ }]);
    // Focus the new input after it renders.
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLInputElement>("li:last-child input")?.focus());
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden /> Create poll
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a poll</DialogTitle>
          <DialogDescription>Everyone in the batch is notified when you publish. Polls can&apos;t be edited later.</DialogDescription>
        </DialogHeader>
        <form {...formProps} className="space-y-4">
          <FormAlert message={!state.ok && !state.fieldErrors ? state.error : null} />
          <FormField label="Question" name="question" error={fieldError("question")} required>
            {(f) => <Input {...f} required maxLength={300} placeholder="e.g. Where should we go for the batch tour?" />}
          </FormField>
          <FormField label="Description" name="description" hint="Optional context for voters." error={fieldError("description")}>
            {(f) => <Textarea {...f} maxLength={1000} rows={2} />}
          </FormField>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              Options <span className="text-destructive" aria-hidden>*</span>
              <span className="ml-1 text-xs font-normal text-muted-foreground">
                ({POLL_MIN_OPTIONS}–{POLL_MAX_OPTIONS})
              </span>
            </legend>
            <ol ref={listRef} className="space-y-2">
              {opts.map((o, i) => (
                <li key={o.key} className="flex items-center gap-2">
                  <Input
                    name="options[]"
                    aria-label={`Option ${i + 1}`}
                    placeholder={`Option ${i + 1}`}
                    maxLength={200}
                    required={i < POLL_MIN_OPTIONS}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={opts.length <= POLL_MIN_OPTIONS}
                    onClick={() => setOpts((prev) => prev.filter((x) => x.key !== o.key))}
                    aria-label={`Remove option ${i + 1}`}
                  >
                    <X aria-hidden />
                  </Button>
                </li>
              ))}
            </ol>
            {fieldError("options") ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                {fieldError("options")}
              </p>
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={addOption} disabled={opts.length >= POLL_MAX_OPTIONS}>
              <Plus aria-hidden /> Add option
            </Button>
          </fieldset>

          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleField id="poll-multiple" name="multipleChoice" label="Multiple choice" hint="Voters can pick more than one option." />
            <ToggleField id="poll-anonymous" name="anonymous" label="Anonymous" hint="Nobody, not even staff, can see who voted for what." />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Starts" name="startsAt" hint="Leave blank to open now." error={fieldError("startsAt")}>
              {(f) => <Input {...f} type="datetime-local" />}
            </FormField>
            <FormField label="Ends" name="endsAt" hint="Optional. Bangladesh time." error={fieldError("endsAt")}>
              {(f) => <Input {...f} type="datetime-local" />}
            </FormField>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <SubmitButton pending={pending} pendingText="Publishing…">
              Publish poll
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
