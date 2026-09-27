"use client";

import { useRouter } from "next/navigation";
import { CalendarPlus, ImageIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { useActionForm } from "@/hooks/use-action-form";
import { createEventAction, updateEventAction } from "@/actions/events";
import { EVENT_TYPE_LABELS, options } from "@/lib/labels";

export type EventFormValues = {
  id: string;
  title: string;
  description: string;
  type: string;
  /** datetime-local values in Dhaka time ("" when empty). */
  startsAt: string;
  endsAt: string;
  registrationDeadline: string;
  location: string;
  organizer: string;
  hasCover: boolean;
};

export function EventForm({ initial }: { initial?: EventFormValues }) {
  const router = useRouter();
  const { state, pending, fieldError, formProps } = useActionForm(initial ? updateEventAction : createEventAction, {
    onSuccess: (data) => data && router.push(`/events/${data.id}`),
  });

  return (
    <form {...formProps} className="space-y-5 rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
      <FormAlert message={!state.ok ? state.error : null} />
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Title" name="title" error={fieldError("title")} required className="sm:col-span-2">
          {(f) => <Input {...f} defaultValue={initial?.title} maxLength={160} required placeholder="e.g. Batch iftar 2026" />}
        </FormField>
        <FormField label="Type" name="type" error={fieldError("type")} required>
          {(f) => (
            <NativeSelect {...f} defaultValue={initial?.type ?? "MEETUP"} className="w-full">
              {options(EVENT_TYPE_LABELS).map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
      </div>

      <FormField label="Description" name="description" error={fieldError("description")} required hint="Plain text; links become clickable.">
        {(f) => <Textarea {...f} defaultValue={initial?.description} rows={6} maxLength={10000} required className="min-h-32" />}
      </FormField>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="sr-only">Date and time (Bangladesh time)</legend>
        <FormField label="Starts" name="startsAt" error={fieldError("startsAt")} required hint="Bangladesh time">
          {(f) => <Input {...f} type="datetime-local" defaultValue={initial?.startsAt} required />}
        </FormField>
        <FormField label="Ends" name="endsAt" error={fieldError("endsAt")} hint="Optional">
          {(f) => <Input {...f} type="datetime-local" defaultValue={initial?.endsAt} />}
        </FormField>
        <FormField label="RSVP deadline" name="registrationDeadline" error={fieldError("registrationDeadline")} hint="Optional — defaults to the start">
          {(f) => <Input {...f} type="datetime-local" defaultValue={initial?.registrationDeadline} />}
        </FormField>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Location" name="location" error={fieldError("location")} required>
          {(f) => <Input {...f} defaultValue={initial?.location} maxLength={200} required placeholder="e.g. IICT Building, SUST" />}
        </FormField>
        <FormField label="Organizer" name="organizer" error={fieldError("organizer")} required>
          {(f) => <Input {...f} defaultValue={initial?.organizer} maxLength={120} required placeholder="e.g. CSE 24 Batch Committee" />}
        </FormField>
      </div>

      <FormField
        label={initial?.hasCover ? "Replace cover image" : "Cover image"}
        name="cover"
        error={fieldError("cover")}
        hint="Optional. JPG, PNG or WebP up to 4 MB — a wide (16:8) image looks best."
      >
        {(f) => <Input {...f} type="file" accept="image/jpeg,image/png,image/webp" />}
      </FormField>
      {initial?.hasCover ? (
        <div className="flex items-center gap-2 text-sm">
          <ImageIcon className="size-4 text-muted-foreground" aria-hidden />
          <Checkbox id="removeCover" name="removeCover" value="on" />
          <Label htmlFor="removeCover" className="font-normal">
            Remove the current cover image
          </Label>
        </div>
      ) : null}

      <div className="flex justify-end border-t pt-4">
        <SubmitButton pending={pending} pendingText={initial ? "Saving…" : "Creating…"}>
          <CalendarPlus aria-hidden /> {initial ? "Save changes" : "Create event"}
        </SubmitButton>
      </div>
    </form>
  );
}
