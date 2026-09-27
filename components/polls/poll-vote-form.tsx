"use client";

import { useId, useState } from "react";
import { Vote } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FormAlert, SubmitButton } from "@/components/shared/form";
import { useActionForm } from "@/hooks/use-action-form";
import { voteAction } from "@/actions/polls";
import { cn } from "@/lib/utils";

const optionRow =
  "flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors hover:bg-muted/60 has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5";

export function PollVoteForm({
  pollId,
  options,
  multipleChoice,
}: {
  pollId: string;
  options: { id: string; label: string }[];
  multipleChoice: boolean;
}) {
  const id = useId();
  const [selected, setSelected] = useState<string[]>([]);
  const { state, pending, fieldError, formProps } = useActionForm(voteAction);
  const error = fieldError("optionIds");
  const legendId = `${id}-legend`;

  return (
    <form {...formProps} className="space-y-3">
      <input type="hidden" name="pollId" value={pollId} />
      {selected.map((optionId) => (
        <input key={optionId} type="hidden" name="optionIds" value={optionId} />
      ))}
      <FormAlert message={!state.ok && !error ? state.error : null} />
      <p id={legendId} className="text-xs font-medium text-muted-foreground">
        {multipleChoice ? "Select all that apply" : "Choose one"}
      </p>

      {multipleChoice ? (
        <div role="group" aria-labelledby={legendId} className="grid gap-2">
          {options.map((o) => {
            const inputId = `${id}-${o.id}`;
            return (
              <label key={o.id} htmlFor={inputId} className={optionRow}>
                <Checkbox
                  id={inputId}
                  checked={selected.includes(o.id)}
                  onCheckedChange={(checked) =>
                    setSelected((prev) => (checked === true ? [...prev, o.id] : prev.filter((x) => x !== o.id)))
                  }
                  aria-invalid={error ? true : undefined}
                />
                <span className="min-w-0 break-words">{o.label}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <RadioGroup
          aria-labelledby={legendId}
          value={selected[0] ?? ""}
          onValueChange={(v) => setSelected([v])}
          className="gap-2"
        >
          {options.map((o) => {
            const inputId = `${id}-${o.id}`;
            return (
              <label key={o.id} htmlFor={inputId} className={optionRow}>
                <RadioGroupItem id={inputId} value={o.id} aria-invalid={error ? true : undefined} />
                <span className="min-w-0 break-words">{o.label}</span>
              </label>
            );
          })}
        </RadioGroup>
      )}

      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}
      <div className={cn("flex items-center justify-between gap-2")}>
        <p className="text-xs text-muted-foreground">Votes are final and can&apos;t be changed.</p>
        <SubmitButton pending={pending} disabled={selected.length === 0} pendingText="Voting…">
          <Vote aria-hidden /> Vote
        </SubmitButton>
      </div>
    </form>
  );
}
