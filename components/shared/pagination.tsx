import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Link-based pagination that preserves the current filters (works without JavaScript). */
export function Pagination({
  page,
  pageCount,
  basePath,
  searchParams,
}: {
  page: number;
  pageCount: number;
  basePath: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (pageCount <= 1) return null;
  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === "page" || v === undefined) continue;
      for (const item of Array.isArray(v) ? v : [v]) if (item) params.append(k, item);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={href(page - 1)} className={buttonVariants({ variant: "outline", size: "sm" })} rel="prev">
          <ChevronLeft aria-hidden /> Previous
        </Link>
      ) : (
        <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")} aria-disabled>
          <ChevronLeft aria-hidden /> Previous
        </span>
      )}
      <span className="px-2 text-sm text-muted-foreground tabular-nums" aria-current="page">
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={href(page + 1)} className={buttonVariants({ variant: "outline", size: "sm" })} rel="next">
          Next <ChevronRight aria-hidden />
        </Link>
      ) : (
        <span className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-50")} aria-disabled>
          Next <ChevronRight aria-hidden />
        </span>
      )}
    </nav>
  );
}
