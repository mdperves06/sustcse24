import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Compass className="size-6" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Button className="mt-6" asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </main>
  );
}
