import { cn } from "@/lib/utils";

const URL_RE = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g;

/**
 * Renders user-written text safely: no HTML is ever interpreted (React escapes it),
 * line breaks are preserved and http(s) links become external links.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(URL_RE);
  return (
    <div className={cn("text-sm leading-relaxed break-words whitespace-pre-wrap", className)}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer nofollow ugc"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </div>
  );
}
