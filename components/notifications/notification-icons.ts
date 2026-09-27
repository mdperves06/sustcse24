import {
  Award,
  Bell,
  Briefcase,
  Cake,
  CalendarClock,
  FolderGit2,
  Heart,
  Megaphone,
  MessageCircle,
  Vote,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "@/lib/generated/prisma/enums";

export const NOTIFICATION_META: Record<NotificationType, { icon: LucideIcon; tone: string; label: string }> = {
  ANNOUNCEMENT: { icon: Megaphone, tone: "bg-primary/10 text-primary", label: "Announcement" },
  EVENT_REMINDER: { icon: CalendarClock, tone: "bg-chart-2/15 text-chart-2", label: "Event" },
  COMMENT: { icon: MessageCircle, tone: "bg-chart-1/15 text-chart-1", label: "Comment" },
  REACTION: { icon: Heart, tone: "bg-chart-4/15 text-chart-4", label: "Reaction" },
  POLL: { icon: Vote, tone: "bg-chart-3/15 text-chart-3", label: "Poll" },
  OPPORTUNITY_DEADLINE: { icon: Briefcase, tone: "bg-chart-5/15 text-chart-5", label: "Opportunity" },
  ACHIEVEMENT_VERIFICATION: { icon: Award, tone: "bg-warning/15 text-warning", label: "Achievement" },
  PROJECT_INTERACTION: { icon: FolderGit2, tone: "bg-chart-1/15 text-chart-1", label: "Project" },
  BIRTHDAY: { icon: Cake, tone: "bg-chart-4/15 text-chart-4", label: "Birthday" },
  SYSTEM: { icon: Bell, tone: "bg-muted text-muted-foreground", label: "System" },
};
