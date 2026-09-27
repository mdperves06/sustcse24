import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-brand-gradient inline-flex size-9 items-center justify-center rounded-xl font-mono text-sm font-bold text-white shadow-sm",
        className,
      )}
      aria-hidden
    >
      24
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none", className)}>
      <LogoMark />
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight">CSE 24</span>
        <span className="block text-[11px] text-muted-foreground">Batch Community</span>
      </span>
    </Link>
  );
}
