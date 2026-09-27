"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, IdCard, LogOut, Menu, Search, Settings, Shield, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { UserAvatar } from "@/components/shared/user-avatar";
import { SidebarNav, isActivePath } from "./sidebar-nav";
import { MOBILE_TABS } from "@/lib/nav";
import { ROLE_LABELS } from "@/lib/labels";
import { can } from "@/lib/auth/permissions";
import { logoutAction } from "@/actions/auth";
import type { Role } from "@/lib/generated/prisma/enums";
import { cn } from "@/lib/utils";

export type ShellUser = { roll: string; fullName: string; avatarKey: string | null; role: Role };

export function AppShell({ user, unread, children }: { user: ShellUser; unread: number; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-dvh">
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-16 items-center px-5">
          <Logo href="/dashboard" />
        </div>
        <ScrollArea className="flex-1 px-3 pb-6">
          <SidebarNav role={user.role} />
        </ScrollArea>
      </aside>

      {/* Mobile / tablet navigation drawer */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[18rem] p-0">
          <SheetHeader className="h-16 justify-center border-b px-5">
            <SheetTitle asChild>
              <div>
                <Logo href="/dashboard" />
              </div>
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100dvh-4rem)] px-3 py-4">
            <SidebarNav role={user.role} onNavigate={() => setMenuOpen(false)} />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open navigation">
            <Menu className="size-5" aria-hidden />
          </Button>
          <div className="lg:hidden">
            <Logo href="/dashboard" className="[&>span:last-child]:hidden sm:[&>span:last-child]:block" />
          </div>

          <form action="/search" method="get" role="search" className="relative ml-auto hidden max-w-md flex-1 md:ml-4 md:block lg:ml-0">
            <label htmlFor="global-search" className="sr-only">
              Search the community
            </label>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              id="global-search"
              name="q"
              type="search"
              placeholder="Search students, posts, projects, events…"
              className="h-9 w-full rounded-full border bg-muted/50 pr-4 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:bg-background focus:ring-3 focus:ring-ring/40"
            />
          </form>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" className="md:hidden" asChild>
              <Link href="/search" aria-label="Search">
                <Search className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link href="/notifications" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}>
                <Bell className="size-4" aria-hidden />
                {unread > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white tabular-nums">
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </Link>
            </Button>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="ml-1 rounded-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                  aria-label="Account menu"
                >
                  <UserAvatar name={user.fullName} avatarKey={user.avatarKey} size="sm" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.roll} · {ROLE_LABELS[user.role]}
                  </p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User aria-hidden /> My profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/id-card">
                    <IdCard aria-hidden /> Digital ID
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings aria-hidden /> Settings
                  </Link>
                </DropdownMenuItem>
                {can(user.role, "admin.access") ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <Shield aria-hidden /> Admin panel
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <form action={logoutAction}>
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full">
                      <LogOut aria-hidden /> Sign out
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-7xl px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Quick navigation"
        className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {MOBILE_TABS.map((tab) => {
            const active = isActivePath(pathname, tab.href);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <tab.icon className="size-5" aria-hidden />
                  {tab.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              <Menu className="size-5" aria-hidden />
              More
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
