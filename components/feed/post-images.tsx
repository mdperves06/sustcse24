import Image from "next/image";
import { fileUrl } from "@/lib/files";
import { cn } from "@/lib/utils";

/** 1–4 image grid. Files come from the authenticated /api/files route, so Next's optimiser is bypassed. */
export function PostImages({ keys }: { keys: string[] }) {
  if (keys.length === 0) return null;
  const single = keys.length === 1;
  return (
    <ul className={cn("grid gap-1.5 overflow-hidden rounded-xl", single ? "grid-cols-1" : "grid-cols-2")} aria-label="Images">
      {keys.map((key, i) => {
        const src = fileUrl(key)!;
        return (
          <li
            key={key}
            className={cn(
              "relative overflow-hidden bg-muted",
              single ? "aspect-video" : "aspect-square",
              keys.length === 3 && i === 0 && "col-span-2 aspect-video",
            )}
          >
            <a
              href={src}
              target="_blank"
              rel="noopener"
              className="block size-full focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Image
                src={src}
                alt={`Image ${i + 1} of ${keys.length}`}
                fill
                unoptimized
                sizes="(min-width: 768px) 40rem, 100vw"
                className="object-cover transition-transform hover:scale-[1.02]"
              />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
