import {
  Award,
  Briefcase,
  Code2,
  FileBadge,
  GraduationCap,
  Mic,
  Rocket,
  ScrollText,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { AchievementCategory } from "@/lib/generated/prisma/enums";

export const ACHIEVEMENT_CATEGORY_META: Record<AchievementCategory, { icon: LucideIcon; tone: string }> = {
  HACKATHON: { icon: Code2, tone: "bg-chart-1/15 text-chart-1" },
  MUN: { icon: Mic, tone: "bg-chart-4/15 text-chart-4" },
  RESEARCH: { icon: ScrollText, tone: "bg-chart-2/15 text-chart-2" },
  SCHOLARSHIP: { icon: GraduationCap, tone: "bg-chart-5/15 text-chart-5" },
  CERTIFICATION: { icon: FileBadge, tone: "bg-chart-3/15 text-chart-3" },
  COMPETITION: { icon: Trophy, tone: "bg-warning/15 text-warning" },
  JOB: { icon: Briefcase, tone: "bg-primary/10 text-primary" },
  STARTUP: { icon: Rocket, tone: "bg-chart-4/15 text-chart-4" },
  OTHER: { icon: Award, tone: "bg-muted text-muted-foreground" },
};
