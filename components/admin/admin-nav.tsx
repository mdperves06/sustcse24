"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  FileUp,
  Flag,
  LayoutDashboard,
  ScrollText,
  Settings2,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { can, type Permission } from "@/lib/auth/permissions";
import type { Role } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; permission: Permission; external?: boolean };

const ITEMS: Item[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, permission: "stats.view" },
  { href: "/admin/students", label: "Students", icon: Users, permission: "students.manage" },
  { href: "/admin/students/import", label: "Import", icon: FileUp, permission: "students.import" },
  { href: "/admin/moderation", label: "Moderation", icon: Flag, permission: "reports.review" },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, permission: "audit.view" },
  { href: "/admin/settings", label: "Settings", icon: Settings2, permission: "settings.manage" },
  { href: "/achievements/review", label: "Achievement reviews", icon: Award, permission: "achievements.verify", external: true },
  { href: "/groups", label: "Groups", icon: UsersRound, permission: "groups.manage", external: true },
];

/** Picks the most specific matching tab so /admin/students/import doesn't also light up "Students". */
function activeHref(pathname: string, items: Item[]) {
  let best: string | null = null;
  for (const item of items) {
    const match = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (match && (!best || item.href.length > best.length)) best = item.href;
  }
  return best;
}

export function AdminNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => can(role, i.permission));
  const current = activeHref(pathname, items);

  return (
    <nav aria-label="Admin sections" className="-mx-4 mb-6 border-b sm:mx-0">
      <ul className="flex gap-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-0 [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = item.href === current;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  active
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                  item.external && "text-muted-foreground/90",
                )}
              >
                <item.icon className={cn("size-4", active ? "text-primary" : "")} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
