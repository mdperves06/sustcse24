import { AlertTriangle, BookOpen, Briefcase, CalendarDays, Megaphone, Siren, type LucideIcon } from "lucide-react";
import type { AnnouncementCategory, Priority } from "@/lib/generated/prisma/enums";

export const CATEGORY_STYLE: Record<AnnouncementCategory, { badge: string; icon: LucideIcon }> = {
  ACADEMIC: { badge: "bg-chart-1/15 text-chart-1", icon: BookOpen },
  EVENT: { badge: "bg-chart-2/15 text-chart-2", icon: CalendarDays },
  IMPORTANT: { badge: "bg-warning/15 text-warning", icon: AlertTriangle },
  GENERAL: { badge: "bg-secondary text-secondary-foreground", icon: Megaphone },
  EMERGENCY: { badge: "bg-destructive/15 text-destructive", icon: Siren },
  CAREER: { badge: "bg-chart-5/15 text-chart-5", icon: Briefcase },
};

export const PRIORITY_STYLE: Record<Priority, string> = {
  LOW: "border-border text-muted-foreground",
  NORMAL: "border-border text-foreground",
  HIGH: "border-warning/40 bg-warning/10 text-warning",
  URGENT: "border-destructive/40 bg-destructive/10 text-destructive",
};

export type Severity = "critical" | "important" | "normal";

export function severityOf(category: AnnouncementCategory, priority: Priority): Severity {
  if (category === "EMERGENCY" || priority === "URGENT") return "critical";
  if (category === "IMPORTANT" || priority === "HIGH") return "important";
  return "normal";
}

/** Card chrome that makes urgent announcements stand out (semantic tokens → works in dark mode). */
export const SEVERITY_CARD: Record<Severity, string> = {
  critical: "border-destructive/40 border-l-4 border-l-destructive bg-destructive/[0.03]",
  important: "border-warning/40 border-l-4 border-l-warning",
  normal: "",
};
