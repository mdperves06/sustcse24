"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Chip-style tag editor. Submits as a single comma-separated hidden input,
 * which the server splits and validates (see `tagList` in lib/validation/common.ts).
 */
export function TagInput({
  id,
  name,
  defaultValue = [],
  placeholder = "Type and press Enter",
  suggestions = [],
  max = 30,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: {
  id?: string;
  name: string;
  defaultValue?: string[];
  placeholder?: string;
  suggestions?: string[];
  max?: number;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}) {
  const [tags, setTags] = useState<string[]>(defaultValue);
  const [draft, setDraft] = useState("");
  const listId = id ? `${id}-suggestions` : undefined;

  function add(raw: string) {
    const parts = raw.split(",").map((t) => t.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setTags((prev) => {
      const next = [...prev];
      for (const p of parts) {
        if (next.length >= max) break;
        if (!next.some((t) => t.toLowerCase() === p.toLowerCase())) next.push(p.slice(0, 40));
      }
      return next;
    });
    setDraft("");
  }

  return (
    <div
      className={cn(
        "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-lg border border-input bg-transparent px-2 py-1.5 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        ariaInvalid && "border-destructive ring-3 ring-destructive/20",
      )}
    >
      <input type="hidden" name={name} value={tags.join(",")} />
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
          {tag}
          <button
            type="button"
            onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
            className="rounded-sm opacity-60 hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={`Remove ${tag}`}
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={draft}
        list={suggestions.length ? listId : undefined}
        onChange={(e) => {
          const v = e.target.value;
          if (v.includes(",")) add(v);
          else setDraft(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && tags.length) {
            setTags((prev) => prev.slice(0, -1));
          }
        }}
        onBlur={() => add(draft)}
        placeholder={tags.length ? "" : placeholder}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className="min-w-[8rem] flex-1 bg-transparent py-0.5 outline-none placeholder:text-muted-foreground"
      />
      {suggestions.length ? (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
    </div>
  );
}
