import { Ban } from "lucide-react";
import { formatDateTime } from "@/lib/time";

export function RestrictionNotice({ restriction }: { restriction: { until: Date; reason: string | null } }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
      <Ban className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div>
        <p className="font-medium">Posting is paused for your account</p>
        <p className="mt-0.5 text-muted-foreground">
          You can read and react, but can&apos;t post or comment until {formatDateTime(restriction.until)}.
          {restriction.reason ? ` Reason: ${restriction.reason}` : ""}
        </p>
      </div>
    </div>
  );
}
