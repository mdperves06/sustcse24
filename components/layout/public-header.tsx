import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";

export function PublicHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav aria-label="Site" className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link href="/about">About</Link>
          </Button>
          <ThemeToggle />
          <Button asChild>
            <Link href={signedIn ? "/dashboard" : "/login"}>{signedIn ? "Open dashboard" : "Sign in"}</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
        <p>© {new Date().getFullYear()} CSE 24 Batch · Private community for verified batch members</p>
        <p>Student information is visible only to signed-in members, according to each student&apos;s privacy settings.</p>
      </div>
    </footer>
  );
}
