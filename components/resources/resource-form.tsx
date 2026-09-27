"use client";

import { useId, useState } from "react";
import { Link2, Plus, Upload } from "lucide-react";
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
import { createResourceAction } from "@/actions/resources";
import { RESOURCE_CATEGORY_LABELS, options } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function ResourceFormDialog({ courses }: { courses: string[] }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"file" | "link">("file");
  const listId = useId();
  const { state, pending, fieldError, formProps } = useActionForm(createResourceAction, {
    resetOnSuccess: true,
    onSuccess: () => setOpen(false),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus aria-hidden /> Share resource
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share a resource</DialogTitle>
          <DialogDescription>Upload notes, slides or past questions — or link to a useful page.</DialogDescription>
        </DialogHeader>
        <form {...formProps} className="space-y-4" encType="multipart/form-data">
          <FormAlert message={!state.ok ? state.error : null} />
          <FormField label="Title" name="title" error={fieldError("title")} required>
            {(f) => <Input {...f} required maxLength={160} placeholder="e.g. Mid-term notes — Graph algorithms" />}
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Course" name="course" error={fieldError("course")} hint="e.g. CSE 331" required>
              {(f) => <Input {...f} required maxLength={60} list={listId} placeholder="CSE 331" autoComplete="off" />}
            </FormField>
            <datalist id={listId}>
              {courses.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <FormField label="Category" name="category" error={fieldError("category")} required>
              {(f) => (
                <NativeSelect {...f} required defaultValue="NOTES" className="w-full">
                  {options(RESOURCE_CATEGORY_LABELS).map((o) => (
                    <NativeSelectOption key={o.value} value={o.value}>
                      {o.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            </FormField>
          </div>
          <FormField label="Description" name="description" error={fieldError("description")}>
            {(f) => <Textarea {...f} rows={3} maxLength={2000} placeholder="What's inside? Which chapters or topics?" />}
          </FormField>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Resource</legend>
            <div className="grid grid-cols-2 gap-1 rounded-lg border p-1" role="radiogroup" aria-label="Resource type">
              {(
                [
                  ["file", "Upload file", Upload],
                  ["link", "Add link", Link2],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={mode === value}
                  onClick={() => setMode(value)}
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                    mode === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" aria-hidden /> {label}
                </button>
              ))}
            </div>
            {mode === "file" ? (
              <FormField label="File" name="file" error={fieldError("file")} hint="PDF, Office, ZIP or image up to 25 MB" required>
                {(f) => (
                  <Input
                    {...f}
                    type="file"
                    required
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,image/jpeg,image/png,image/webp"
                  />
                )}
              </FormField>
            ) : (
              <FormField label="Link" name="url" error={fieldError("url")} hint="Google Drive, YouTube, a blog post…" required>
                {(f) => <Input {...f} type="url" required placeholder="https://…" />}
              </FormField>
            )}
          </fieldset>

          <div className="flex justify-end">
            <SubmitButton pending={pending} pendingText="Sharing…">
              Share resource
            </SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
