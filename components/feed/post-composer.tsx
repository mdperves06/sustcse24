"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormAlert, SubmitButton } from "@/components/shared/form";
import { UserAvatar } from "@/components/shared/user-avatar";
import { PostFields } from "@/components/feed/post-fields";
import { useActionForm } from "@/hooks/use-action-form";
import { createPostAction } from "@/actions/posts";
import { POST_MAX_IMAGES } from "@/lib/validation/posts";

type Preview = { file: File; url: string };

export function PostComposer({
  viewer,
  allowAnnouncement,
  groupId,
  placeholderTitle = "Share with the batch",
}: {
  viewer: { fullName: string; avatarKey: string | null };
  allowAnnouncement: boolean;
  groupId?: string;
  placeholderTitle?: string;
}) {
  const [previews, setPreviews] = useState<Preview[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);
  const { state, pending, fieldError, formProps } = useActionForm(createPostAction, {
    resetOnSuccess: true,
    onSuccess: () =>
      setPreviews((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.url));
        return [];
      }),
  });

  // Keep the real <input type="file"> in sync with the preview list (so removals are submitted too).
  useEffect(() => {
    const input = fileInput.current;
    if (!input) return;
    const dt = new DataTransfer();
    for (const p of previews) dt.items.add(p.file);
    input.files = dt.files;
  }, [previews]);

  // Revoke any remaining object URLs when the composer unmounts.
  const previewsRef = useRef(previews);
  useEffect(() => {
    previewsRef.current = previews;
  }, [previews]);
  useEffect(() => () => previewsRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  function removePreview(url: string) {
    URL.revokeObjectURL(url);
    setPreviews((prev) => prev.filter((x) => x.url !== url));
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    // Copy first: the sync effect replaces input.files after the state update.
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const room = POST_MAX_IMAGES - previews.length;
    if (incoming.length > room) toast.error(`You can attach up to ${POST_MAX_IMAGES} images.`);
    const next = incoming.slice(0, Math.max(0, room)).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPreviews((prev) => [...prev, ...next]);
  }

  const imageError = fieldError("images");

  return (
    <section aria-label={placeholderTitle} className="rounded-2xl border bg-card p-4 shadow-xs sm:p-5">
      <div className="mb-3 flex items-center gap-3">
        <UserAvatar name={viewer.fullName} avatarKey={viewer.avatarKey} size="sm" />
        <p className="text-sm font-medium">{placeholderTitle}</p>
      </div>
      <form {...formProps} className="space-y-3" encType="multipart/form-data">
        {groupId ? <input type="hidden" name="groupId" value={groupId} /> : null}
        <FormAlert message={!state.ok && !state.fieldErrors ? state.error : null} />
        <PostFields fieldError={fieldError} allowAnnouncement={allowAnnouncement} />

        {previews.length ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Attached images">
            {previews.map((p, i) => (
              <li key={p.url} className="relative aspect-square overflow-hidden rounded-xl border bg-muted">
                {/* Local object URL preview — next/image can't optimise blob: URLs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={`Attachment ${i + 1}`} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePreview(p.url)}
                  className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  aria-label={`Remove attachment ${i + 1}`}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {imageError ? (
          <p role="alert" className="text-xs font-medium text-destructive">
            {imageError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div>
            <input
              ref={fileInput}
              id={groupId ? `images-${groupId}` : "post-images"}
              name="images"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => addFiles(e.target.files)}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={previews.length >= POST_MAX_IMAGES}
              onClick={() => fileInput.current?.click()}
            >
              <ImagePlus aria-hidden /> Photos
              <span className="text-muted-foreground tabular-nums">
                {previews.length}/{POST_MAX_IMAGES}
              </span>
            </Button>
          </div>
          <SubmitButton pending={pending} pendingText="Posting…">
            <Send aria-hidden /> Post
          </SubmitButton>
        </div>
      </form>
    </section>
  );
}
