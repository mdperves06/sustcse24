"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { fileUrl } from "@/lib/files";
import { cn } from "@/lib/utils";

/** Screenshot grid; clicking opens an enlarged view with keyboard/arrow navigation. */
export function ScreenshotGallery({ images, title }: { images: { id: string; key: string }[]; title: string }) {
  const [index, setIndex] = useState<number | null>(null);
  if (images.length === 0) return null;
  const current = index !== null ? images[index] : null;
  const go = (delta: number) => setIndex((i) => (i === null ? i : (i + delta + images.length) % images.length));

  return (
    <>
      <ul className={cn("grid gap-3", images.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3")}>
        {images.map((img, i) => (
          <li key={img.id} className={cn(i === 0 && images.length > 2 && "col-span-2 row-span-2")}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block aspect-video w-full overflow-hidden rounded-xl border bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              aria-label={`Enlarge screenshot ${i + 1} of ${images.length}`}
            >
              <Image
                src={fileUrl(img.key)!}
                alt={`${title} — screenshot ${i + 1}`}
                fill
                unoptimized
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>
      <Dialog open={current !== null} onOpenChange={(open) => !open && setIndex(null)}>
        <DialogContent
          className="max-w-[calc(100vw-2rem)] p-2 sm:max-w-5xl"
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
        >
          <DialogTitle className="sr-only">
            {title} — screenshot {index !== null ? index + 1 : ""} of {images.length}
          </DialogTitle>
          {current ? (
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black/90">
              <Image src={fileUrl(current.key)!} alt={`${title} — screenshot ${(index ?? 0) + 1}`} fill unoptimized sizes="100vw" className="object-contain" />
            </div>
          ) : null}
          {images.length > 1 ? (
            <div className="flex items-center justify-between px-1 pb-1">
              <Button variant="outline" size="sm" onClick={() => go(-1)}>
                <ChevronLeft aria-hidden /> Previous
              </Button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {(index ?? 0) + 1} / {images.length}
              </span>
              <Button variant="outline" size="sm" onClick={() => go(1)}>
                Next <ChevronRight aria-hidden />
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
