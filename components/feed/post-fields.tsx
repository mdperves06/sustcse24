"use client";

import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/shared/form";
import type { PostType } from "@/lib/generated/prisma/enums";
import { POST_TYPE_LABELS, options } from "@/lib/labels";
import { POST_MAX_LENGTH } from "@/lib/validation/posts";

export function postTypeOptions(allowAnnouncement: boolean) {
  return options(POST_TYPE_LABELS).filter((o) => allowAnnouncement || o.value !== "ANNOUNCEMENT");
}

/** Type + text + link fields shared by the composer and the edit dialog. */
export function PostFields({
  fieldError,
  allowAnnouncement,
  defaults,
  autoFocus,
}: {
  fieldError: (name: string) => string | undefined;
  allowAnnouncement: boolean;
  defaults?: { type: PostType; content: string; linkUrl: string | null };
  autoFocus?: boolean;
}) {
  return (
    <>
      <FormField label="What's on your mind?" name="content" error={fieldError("content")} required>
        {(f) => (
          <Textarea
            {...f}
            required
            autoFocus={autoFocus}
            maxLength={POST_MAX_LENGTH}
            rows={3}
            defaultValue={defaults?.content}
            placeholder="Share an update, ask a question, start a discussion…"
            className="min-h-24"
          />
        )}
      </FormField>
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <FormField label="Type" name="type" error={fieldError("type")}>
          {(f) => (
            <NativeSelect {...f} defaultValue={defaults?.type ?? "GENERAL"} className="w-full">
              {postTypeOptions(allowAnnouncement || defaults?.type === "ANNOUNCEMENT").map((o) => (
                <NativeSelectOption key={o.value} value={o.value}>
                  {o.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </FormField>
        <FormField label="Link" name="linkUrl" error={fieldError("linkUrl")}>
          {(f) => <Input {...f} type="url" inputMode="url" placeholder="https://… (optional)" defaultValue={defaults?.linkUrl ?? ""} />}
        </FormField>
      </div>
    </>
  );
}
