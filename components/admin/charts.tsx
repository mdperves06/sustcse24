import { cn } from "@/lib/utils";

/** Horizontal bar list — CSS only, accessible as a plain list of label/value pairs. */
export function BarList({
  items,
  tone = "bg-primary",
  emptyText = "No data yet.",
}: {
  items: { label: string; value: number; hint?: string }[];
  tone?: string;
  emptyText?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{item.label}</span>
            <span className="shrink-0 font-medium tabular-nums">
              {item.value}
              {item.hint ? <span className="ml-1 text-xs font-normal text-muted-foreground">{item.hint}</span> : null}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className={cn("h-full rounded-full transition-all", tone)} style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

type Series = { key: string; label: string; tone: string };

/**
 * Vertical grouped column chart for a short daily series. Rendered with CSS; the underlying
 * numbers are exposed to assistive tech through a visually hidden table.
 */
export function ColumnChart<T extends { label: string } & Record<string, number | string>>({
  data,
  series,
  caption,
}: {
  data: T[];
  series: Series[];
  caption: string;
}) {
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)));
  return (
    <figure>
      <div className="flex h-44 items-end gap-1 sm:gap-1.5" aria-hidden>
        {data.map((d) => (
          <div key={d.label} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
            <div className="flex h-full items-end justify-center gap-px">
              {series.map((s) => {
                const v = Number(d[s.key]) || 0;
                return (
                  <div
                    key={s.key}
                    className={cn("w-full max-w-3 rounded-t-sm", s.tone, v === 0 && "opacity-30")}
                    style={{ height: `${Math.max(v === 0 ? 2 : 4, (v / max) * 100)}%` }}
                    title={`${d.label} · ${s.label}: ${v}`}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1 text-[10px] text-muted-foreground sm:gap-1.5" aria-hidden>
        {data.map((d, i) => (
          <span key={d.label} className={cn("min-w-0 flex-1 truncate text-center", i % 2 === 1 && "max-sm:invisible")}>
            {d.label}
          </span>
        ))}
      </div>
      <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-sm", s.tone)} aria-hidden />
            {s.label}
          </span>
        ))}
      </figcaption>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              {series.map((s) => (
                <td key={s.key}>{Number(d[s.key]) || 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
