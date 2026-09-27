import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-6 sm:px-8">
        <div className="flex items-center justify-between">
          <Logo />
          <ThemeToggle />
        </div>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <p className="text-center text-xs text-muted-foreground">
          Private community for verified CSE 24 batch members.
        </p>
      </div>
      <div className="bg-brand-gradient relative hidden overflow-hidden lg:block" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.15),transparent_40%)]" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <p className="font-mono text-8xl font-bold tracking-tighter opacity-90">24</p>
          <p className="mt-4 max-w-md text-3xl font-semibold tracking-tight">Connect. Collaborate. Grow Together.</p>
          <p className="mt-3 max-w-md text-white/80">
            Your batch directory, events, projects, opportunities and resources — all in one private place.
          </p>
        </div>
      </div>
    </div>
  );
}
