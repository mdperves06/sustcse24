"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { FormField, SubmitButton } from "@/components/shared/form";
import { useActionForm } from "@/hooks/use-action-form";
import { sendBirthdayWishAction } from "@/actions/birthdays";

const MAX = 280;

export function WishForm({ toUserId, firstName, alreadySent }: { toUserId: string; firstName: string; alreadySent: boolean }) {
  const [sent, setSent] = useState(alreadySent);
  const [text, setText] = useState("");
  const { pending, fieldError, formProps } = useActionForm(sendBirthdayWishAction, {
    onSuccess: () => setSent(true),
  });

  if (sent) {
    return (
      <p className="flex items-center gap-1.5 text-sm font-medium text-success">
        <Check className="size-4" aria-hidden /> You wished {firstName} this year.
      </p>
    );
  }

  return (
    <form {...formProps} className="space-y-2">
      <input type="hidden" name="toUserId" value={toUserId} />
      <FormField
        label={`Wish ${firstName} a happy birthday`}
        name="message"
        error={fieldError("message")}
        hint={`${MAX - text.length} characters left`}
      >
        {(f) => (
          <Textarea
            {...f}
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            maxLength={MAX}
            rows={2}
            required
            placeholder={`Happy birthday, ${firstName}! 🎉`}
          />
        )}
      </FormField>
      <SubmitButton pending={pending} pendingText="Sending…" size="sm" disabled={!text.trim()}>
        <Send aria-hidden /> Send wish
      </SubmitButton>
    </form>
  );
}
