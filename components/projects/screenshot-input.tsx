"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, RotateCcw, X } from "lucide-react";
import { fileUrl } from "@/lib/files";
import { cn } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Screenshot manager: existing images can be marked for removal (submitted as
 * `removeImageIds`), new files are previewed and submitted as `screenshots`.
 */
export function ScreenshotInput({
  id,
  max,
  existing = [],
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  id: string;
  max: number;
  existing?: { id: string; key: string }[];
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  // Keep the real <input type=file> in sync so the form submits exactly these files.
  useEffect(() => {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    files.forEach((f) => dt.items.add(f));
    inputRef.current.files = dt.files;
  }, [files]);

  const kept = existing.length - removed.length;
  const room = Math.max(0, max - kept - files.length);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    const ok: File[] = [];
    const problems: string[] = [];
    for (const f of incoming) {
      if (!TYPES.includes(f.type)) problems.push(`${f.name}: use JPG, PNG or WebP`);
      else if (f.size > MAX_BYTES) problems.push(`${f.name}: larger than 5 MB`);
      else ok.push(f);
    }
    setFiles((prev) => {
      const space = Math.max(0, max - kept - prev.length);
      if (ok.length > space) problems.push(`Only ${max} screenshots allowed — extra files were skipped.`);
      return [...prev, ...ok.slice(0, space)];
    });
    setWarning(problems.length ? problems.join(" · ") : null);
  }

  return (
    <div className="space-y-3">
      {removed.map((rid) => (
        <input key={rid} type="hidden" name="removeImageIds" value={rid} />
      ))}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {existing.map((img) => {
          const isRemoved = removed.includes(img.id);
          return (
            <li key={img.id} className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
              <Image
                src={fileUrl(img.key)!}
                alt=""
                fill
                unoptimized
                sizes="200px"
                className={cn("object-cover", isRemoved && "opacity-30 grayscale")}
              />
              <button
                type="button"
                onClick={() => setRemoved((prev) => (isRemoved ? prev.filter((x) => x !== img.id) : [...prev, img.id]))}
                className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-background/90 shadow-sm hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                aria-label={isRemoved ? "Keep this screenshot" : "Remove this screenshot"}
                aria-pressed={isRemoved}
              >
                {isRemoved ? <RotateCcw className="size-3.5" aria-hidden /> : <X className="size-3.5" aria-hidden />}
              </button>
              {isRemoved ? (
                <span className="absolute inset-x-0 bottom-0 bg-destructive/90 py-0.5 text-center text-[11px] font-medium text-white">
                  Will be removed
                </span>
              ) : null}
            </li>
          );
        })}
        {files.map((f, i) => (
          <li key={`${f.name}-${i}`} className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
            <Image src={previews[i]!} alt="" fill unoptimized sizes="200px" className="object-cover" />
            <button
              type="button"
              onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
              className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-full bg-background/90 shadow-sm hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-label={`Remove ${f.name}`}
            >
              <X className="size-3.5" aria-hidden />
            </button>
            <span className="absolute inset-x-0 bottom-0 truncate bg-background/85 px-2 py-0.5 text-[11px]">New · {f.name}</span>
          </li>
        ))}
        {room > 0 ? (
          <li>
            <label
              htmlFor={id}
              className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 focus-within:ring-3 focus-within:ring-ring/50"
            >
              <ImagePlus className="size-5" aria-hidden />
              Add screenshot
              <span className="text-xs">{room} left</span>
            </label>
          </li>
        ) : null}
      </ul>
      <input
        ref={inputRef}
        id={id}
        name="screenshots"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        aria-describedby={describedBy}
        aria-invalid={invalid}
        onChange={(e) => {
          const list = e.target.files;
          // Copy before the sync effect replaces the input's FileList.
          const copy = list ? Array.from(list) : [];
          const dt = new DataTransfer();
          copy.forEach((f) => dt.items.add(f));
          addFiles(dt.files);
        }}
      />
      {warning ? (
        <p className="text-xs text-warning" role="status">
          {warning}
        </p>
      ) : null}
    </div>
  );
}
