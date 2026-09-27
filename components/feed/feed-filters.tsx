import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { POST_TYPE_LABELS, options } from "@/lib/labels";
import type { FeedFilters as Filters } from "@/lib/validation/posts";

/** GET form (works without JS, shareable URLs). */
export function FeedFilters({ filters, basePath }: { filters: Filters; basePath: string }) {
  const active = Boolean(filters.q || filters.type);
  return (
    <form method="get" action={basePath} role="search" className="flex flex-col gap-2 sm:flex-row">
      <div className="relative flex-1">
        <label htmlFor="feed-q" className="sr-only">
          Search posts
        </label>
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input id="feed-q" name="q" type="search" defaultValue={filters.q} placeholder="Search posts…" className="h-9 pl-9" />
      </div>
      <div className="flex gap-2">
        <label htmlFor="feed-type" className="sr-only">
          Post type
        </label>
        <NativeSelect id="feed-type" name="type" defaultValue={filters.type ?? ""} className="flex-1 sm:w-40 [&_select]:h-9">
          <NativeSelectOption value="">All types</NativeSelectOption>
          {options(POST_TYPE_LABELS).map((o) => (
            <NativeSelectOption key={o.value} value={o.value}>
              {o.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button type="submit" variant="secondary" className="h-9">
          Filter
        </Button>
        {active ? (
          <Button variant="ghost" className="h-9" asChild>
            <Link href={basePath} aria-label="Clear filters">
              <X aria-hidden />
              <span className="hidden sm:inline">Clear</span>
            </Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
