"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/lib/nav";
import { can } from "@/lib/auth/permissions";
import type { Role } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="space-y-6">
      {NAV_SECTIONS.map((section) => {
        const items = section.items.filter((i) => !i.permission || can(role, i.permission));
        if (items.length === 0) return null;
        return (
          <div key={section.title}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-muted-foreground/80 uppercase">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                      )}
                    >
                      <item.icon
                        className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")}
                        aria-hidden
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
