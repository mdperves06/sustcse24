import Link from "next/link";
import {
  Download,
  ExternalLink,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Link2,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { DeleteResourceButton } from "@/components/resources/delete-resource-button";
import { RESOURCE_CATEGORY_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/time";
import type { ResourceItem } from "@/services/resources";

export function formatBytes(bytes: number | null): string | null {
  if (bytes == null) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function typeMeta(r: ResourceItem): { icon: LucideIcon; label: string; tone: string } {
  if (r.kind === "link") return { icon: Link2, label: "Link", tone: "bg-chart-2/15 text-chart-2" };
  const mime = r.mimeType ?? "";
  if (mime === "application/pdf") return { icon: FileText, label: "PDF", tone: "bg-destructive/10 text-destructive" };
  if (mime.startsWith("image/")) return { icon: FileImage, label: "Image", tone: "bg-chart-4/15 text-chart-4" };
  if (mime.includes("presentation") || mime.includes("powerpoint"))
    return { icon: Presentation, label: "Slides", tone: "bg-chart-3/15 text-chart-3" };
  if (mime.includes("spreadsheet") || mime.includes("excel"))
    return { icon: FileSpreadsheet, label: "Sheet", tone: "bg-chart-5/15 text-chart-5" };
  if (mime === "application/zip") return { icon: FileArchive, label: "ZIP", tone: "bg-muted text-muted-foreground" };
  return { icon: FileText, label: "Document", tone: "bg-primary/10 text-primary" };
}

export function ResourceCard({ resource: r }: { resource: ResourceItem }) {
  const meta = typeMeta(r);
  const Icon = meta.icon;
  const size = formatBytes(r.fileSize);
  const href = `/api/resources/${r.id}/download`;

  return (
    <article className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}>
          <Icon className="size-5" aria-hidden />
          <span className="sr-only">{meta.label}</span>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 leading-snug font-semibold">{r.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Link href={`/resources?course=${encodeURIComponent(r.course)}`} className="rounded-4xl">
              <Badge variant="outline" className="font-mono">
                {r.course}
              </Badge>
            </Link>
            <Badge variant="secondary">{RESOURCE_CATEGORY_LABELS[r.category]}</Badge>
          </div>
        </div>
        {r.canDelete ? <DeleteResourceButton id={r.id} title={r.title} /> : null}
      </div>

      {r.description ? <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{r.description}</p> : null}

      <p className="mt-3 mb-4 truncate text-xs text-muted-foreground">
        {r.kind === "file" ? (
          <>
            {meta.label}
            {size ? ` · ${size}` : ""}
            {r.fileName ? <span title={r.fileName}> · {r.fileName}</span> : null}
          </>
        ) : (
          <>Link · {r.host ?? "external site"}</>
        )}
      </p>

      <div className="mt-auto flex items-center justify-between gap-3 border-t pt-4">
        <Link
          href={`/students/${encodeURIComponent(r.uploadedBy.roll)}`}
          className="flex min-w-0 items-center gap-2 rounded-md text-xs hover:underline"
        >
          <UserAvatar name={r.uploadedBy.name} avatarKey={r.uploadedBy.avatarKey} size="xs" />
          <span className="min-w-0">
            <span className="block truncate font-medium">{r.uploadedBy.name}</span>
            <span className="block text-muted-foreground">{formatDate(r.createdAt)}</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums" title="Downloads">
            <Download className="mr-0.5 inline size-3.5 align-[-2px]" aria-hidden />
            {r.downloads}
            <span className="sr-only"> downloads</span>
          </span>
          <Button size="sm" asChild>
            <a
              href={href}
              target="_blank"
              rel={r.kind === "link" ? "noopener noreferrer nofollow" : "noopener"}
              aria-label={`${r.kind === "link" ? "Open" : "Download"} ${r.title}`}
            >
              {r.kind === "link" ? <ExternalLink aria-hidden /> : <Download aria-hidden />}
              {r.kind === "link" ? "Open" : "Get"}
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}
