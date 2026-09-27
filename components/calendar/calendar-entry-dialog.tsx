"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { useActionForm } from "@/hooks/use-action-form";
import { createCalendarEntryAction } from "@/actions/calendar";
import { CALENDAR_TYPE_LABELS, options } from "@/lib/labels";

function EntryForm({ defaultDate, onDone }: { defaultDate: string; onDone: () => void }) {
  const [allDay, setAllDay] = useState(false);
  const { state, pending, fieldError, formProps } = useActionForm(createCalendarEntryAction, { onSuccess: onDone });

  return (
    <form {...formProps} className="space-y-4">
      <FormAlert message={!state.ok ? state.error : null} />
      <FormField label="Title" name="title" error={fieldError("title")} required>
        {(f) => <Input {...f} maxLength={160} required placeholder="e.g. CSE 331 mid-term" />}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Type" name="type" error={fieldError("type")} required>
          {(f) => (
            <NativeSelect {...f} defaultValue="EXAM" className="w-full">
              {options(CALENDAR_TYPE_LABELS).map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField label="Course" name="course" error={fieldError("course")}>
          {(f) => <Input {...f} maxLength={60} placeholder="e.g. CSE 331" />}
        </FormField>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="cal-allday" name="allDay" value="on" checked={allDay} onCheckedChange={(v) => setAllDay(v === true)} />
        <Label htmlFor="cal-allday" className="font-normal">
          All-day
        </Label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Starts" name="startsAt" error={fieldError("startsAt")} required hint="Bangladesh time">
          {(f) =>
            allDay ? (
              <Input key="d" {...f} type="date" defaultValue={defaultDate} required />
            ) : (
              <Input key="dt" {...f} type="datetime-local" defaultValue={`${defaultDate}T09:00`} required />
            )
          }
        </FormField>
        <FormField label={allDay ? "Last day" : "Ends"} name="endsAt" error={fieldError("endsAt")} hint="Optional">
          {(f) => (allDay ? <Input key="d" {...f} type="date" /> : <Input key="dt" {...f} type="datetime-local" />)}
        </FormField>
      </div>
      <FormField label="Location" name="location" error={fieldError("location")}>
        {(f) => <Input {...f} maxLength={200} placeholder="e.g. Room 332, IICT" />}
      </FormField>
      <FormField label="Description" name="description" error={fieldError("description")}>
        {(f) => <Textarea {...f} maxLength={2000} rows={3} placeholder="Syllabus, submission link, notes…" />}
      </FormField>
      <div className="flex justify-end">
        <SubmitButton pending={pending} pendingText="Adding…">
          <Plus aria-hidden /> Add to calendar
        </SubmitButton>
      </div>
    </form>
  );
}

export function CalendarEntryDialog({ defaultDate }: { defaultDate: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden /> Add entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to the batch calendar</DialogTitle>
          <DialogDescription>Exams, assignments, deadlines and more — visible to the whole batch.</DialogDescription>
        </DialogHeader>
        {open ? <EntryForm defaultDate={defaultDate} onDone={() => setOpen(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}
