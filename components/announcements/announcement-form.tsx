"use client";

import { useRouter } from "next/navigation";
import { Paperclip, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { useActionForm } from "@/hooks/use-action-form";
import { createAnnouncementAction, updateAnnouncementAction } from "@/actions/announcements";
import { ANNOUNCEMENT_CATEGORY_LABELS, PRIORITY_LABELS, options } from "@/lib/labels";

export type AnnouncementFormValues = {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: string;
  pinned: boolean;
  /** `YYYY-MM-DDTHH:mm` in Dhaka time, or "". */
  expiresAt: string;
  attachmentName: string | null;
};

export function AnnouncementForm({ initial }: { initial?: AnnouncementFormValues }) {
  const router = useRouter();
  const { state, pending, fieldError, formProps } = useActionForm(
    initial ? updateAnnouncementAction : createAnnouncementAction,
    { onSuccess: (data) => data && router.push(`/announcements/${data.id}`) },
  );

  return (
    <form {...formProps} className="space-y-5 rounded-2xl border bg-card p-5 shadow-xs sm:p-6">
      <FormAlert message={!state.ok ? state.error : null} />
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}

      <FormField label="Title" name="title" error={fieldError("title")} required>
        {(f) => <Input {...f} defaultValue={initial?.title} maxLength={160} required placeholder="e.g. Mid-term routine published" />}
      </FormField>

      <FormField
        label="Message"
        name="body"
        error={fieldError("body")}
        hint="Plain text. Line breaks are kept and links become clickable."
        required
      >
        {(f) => <Textarea {...f} defaultValue={initial?.body} rows={8} maxLength={10000} required className="min-h-40" />}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Category" name="category" error={fieldError("category")} required>
          {(f) => (
            <NativeSelect {...f} defaultValue={initial?.category ?? "GENERAL"} className="w-full">
              {options(ANNOUNCEMENT_CATEGORY_LABELS).map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField label="Priority" name="priority" error={fieldError("priority")} required>
          {(f) => (
            <NativeSelect {...f} defaultValue={initial?.priority ?? "NORMAL"} className="w-full">
              {options(PRIORITY_LABELS).map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField label="Expires on" name="expiresAt" error={fieldError("expiresAt")} hint="Optional. Hidden from Active after this.">
          {(f) => <Input {...f} type="datetime-local" defaultValue={initial?.expiresAt} />}
        </FormField>
      </div>

      <FormField
        label={initial?.attachmentName ? "Replace attachment" : "Attachment"}
        name="attachment"
        error={fieldError("attachment")}
        hint="Optional. PDF, Office document or image up to 10 MB."
      >
        {(f) => <Input {...f} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/jpeg,image/png,image/webp" />}
      </FormField>

      {initial?.attachmentName ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2 text-sm">
          <Paperclip className="size-4 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{initial.attachmentName}</span>
          <div className="flex items-center gap-2">
            <Checkbox id="removeAttachment" name="removeAttachment" value="on" />
            <Label htmlFor="removeAttachment" className="text-sm font-normal">
              Remove attachment
            </Label>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Checkbox id="pinned" name="pinned" value="on" defaultChecked={initial?.pinned ?? false} />
        <Label htmlFor="pinned" className="text-sm font-normal">
          Pin to the top of the announcement board
        </Label>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
        <SubmitButton pending={pending} pendingText={initial ? "Saving…" : "Publishing…"}>
          <Send aria-hidden /> {initial ? "Save changes" : "Publish announcement"}
        </SubmitButton>
      </div>
    </form>
  );
}
