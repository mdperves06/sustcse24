import Link from "next/link";
import { cn } from "@/lib/utils";

/** Horizontal CSS bar chart; each row links to the privacy-safe directory filter. */
export function SkillBars({
  items,
  total,
  barClass = "bg-primary",
  linkParam = "skill",
  label,
}: {
  items: { name: string; count: number }[];
  /** Denominator for the percentage shown in the tooltip/sr text (e.g. members with skills). */
  total: number;
  barClass?: string;
  linkParam?: "skill" | "interest";
  label: string;
}) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">No data yet.</p>;
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="space-y-2.5" aria-label={label}>
      {items.map((i) => {
        const pct = total ? Math.round((i.count / total) * 100) : 0;
        return (
          <li key={i.name}>
            <Link
              href={`/directory?${linkParam}=${encodeURIComponent(i.name)}`}
              className="group block rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              title={`${i.count} member${i.count === 1 ? "" : "s"} (${pct}%) — view in directory`}
            >
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium group-hover:underline">{i.name}</span>
                <span className="shrink-0 text-muted-foreground tabular-nums">
                  {i.count}
                  <span className="sr-only"> members, {pct} percent</span>
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                <div
                  className={cn("h-full rounded-full transition-all group-hover:opacity-80", barClass)}
                  style={{ width: `${Math.max(2, (i.count / max) * 100)}%` }}
                />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
