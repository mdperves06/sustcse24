import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  primary: "bg-primary/10 text-primary",
  teal: "bg-chart-2/15 text-chart-2",
  amber: "bg-chart-3/15 text-chart-3",
  pink: "bg-chart-4/15 text-chart-4",
  green: "bg-chart-5/15 text-chart-5",
} as const;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
  href,
  children,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: LucideIcon;
  tone?: keyof typeof TONES;
  href?: string;
  children?: React.ReactNode;
}) {
  const body = (
    <div
      className={cn(
        "group h-full rounded-2xl border bg-card p-4 shadow-xs transition-all sm:p-5",
        href && "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</p>
        </div>
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", TONES[tone])}>
          <Icon className="size-5" aria-hidden />
        </div>
      </div>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
      {children}
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    body
  );
}
