"use client";

import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormAlert, FormField, SubmitButton } from "@/components/shared/form";
import { TagInput } from "@/components/shared/tag-input";
import { MemberPicker, type PickedMember } from "@/components/projects/member-picker";
import { ScreenshotInput } from "@/components/projects/screenshot-input";
import { useActionForm } from "@/hooks/use-action-form";
import { createProjectAction, updateProjectAction } from "@/actions/projects";
import { PROJECT_CATEGORY_LABELS, options } from "@/lib/labels";
import { MAX_PROJECT_IMAGES } from "@/lib/validation/projects";

const TECH_SUGGESTIONS = [
  "React", "Next.js", "TypeScript", "Node.js", "Python", "Django", "FastAPI", "Flutter", "Kotlin",
  "PyTorch", "TensorFlow", "PostgreSQL", "MongoDB", "Firebase", "Docker", "Arduino", "Raspberry Pi", "OpenCV",
];

export type ProjectFormDefaults = {
  id: string;
  title: string;
  description: string;
  category: string;
  technologies: string[];
  githubUrl: string | null;
  demoUrl: string | null;
  members: PickedMember[];
  images: { id: string; key: string }[];
};

export function ProjectForm({
  author,
  defaults,
}: {
  author: { roll: string; name: string; avatarKey: string | null };
  defaults?: ProjectFormDefaults;
}) {
  const router = useRouter();
  const action = defaults ? updateProjectAction.bind(null, defaults.id) : createProjectAction;
  const { state, pending, fieldError, formProps } = useActionForm(action, {
    onSuccess: (data) => {
      if (data?.id) router.push(`/projects/${data.id}`);
    },
  });

  return (
    <form {...formProps} className="space-y-6" encType="multipart/form-data">
      <FormAlert message={!state.ok ? state.error : null} />
      <Card>
        <CardHeader>
          <CardTitle>About the project</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField label="Title" name="title" error={fieldError("title")} required className="sm:col-span-2">
            {(f) => <Input {...f} required maxLength={120} defaultValue={defaults?.title} placeholder="e.g. Bangla OCR" />}
          </FormField>
          <FormField label="Category" name="category" error={fieldError("category")} required>
            {(f) => (
              <NativeSelect {...f} required defaultValue={defaults?.category ?? "WEB"} className="w-full">
                {options(PROJECT_CATEGORY_LABELS).map((o) => (
                  <NativeSelectOption key={o.value} value={o.value}>
                    {o.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
          </FormField>
          <FormField label="Technologies" name="technologies" error={fieldError("technologies")} hint="Press Enter after each (up to 15)">
            {(f) => <TagInput {...f} defaultValue={defaults?.technologies} suggestions={TECH_SUGGESTIONS} max={15} />}
          </FormField>
          <FormField label="Description" name="description" error={fieldError("description")} required className="sm:col-span-2">
            {(f) => (
              <Textarea
                {...f}
                required
                rows={8}
                maxLength={8000}
                defaultValue={defaults?.description}
                placeholder="What problem does it solve? How does it work? What did you learn?"
              />
            )}
          </FormField>
          <FormField label="GitHub repository" name="githubUrl" error={fieldError("githubUrl")}>
            {(f) => <Input {...f} type="url" defaultValue={defaults?.githubUrl ?? ""} placeholder="https://github.com/…" />}
          </FormField>
          <FormField label="Live demo" name="demoUrl" error={fieldError("demoUrl")}>
            {(f) => <Input {...f} type="url" defaultValue={defaults?.demoUrl ?? ""} placeholder="https://…" />}
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Screenshots</CardTitle>
          <CardDescription>Up to {MAX_PROJECT_IMAGES} images — JPG, PNG or WebP, 5 MB each. The first one is the cover.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField label={<span className="sr-only">Screenshots</span>} name="screenshots" error={fieldError("screenshots")}>
            {(f) => (
              <ScreenshotInput
                id={f.id}
                max={MAX_PROJECT_IMAGES}
                existing={defaults?.images}
                aria-describedby={f["aria-describedby"]}
                aria-invalid={f["aria-invalid"]}
              />
            )}
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>Add batchmates who built this with you. You&apos;re listed as the Lead.</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField label={<span className="sr-only">Team members</span>} name="members" error={fieldError("members")}>
            {(f) => (
              <MemberPicker name={f.name} author={author} initial={defaults?.members} aria-describedby={f["aria-describedby"]} />
            )}
          </FormField>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <SubmitButton pending={pending} pendingText={defaults ? "Saving…" : "Publishing…"}>
          {defaults ? "Save changes" : "Publish project"}
        </SubmitButton>
      </div>
    </form>
  );
}
