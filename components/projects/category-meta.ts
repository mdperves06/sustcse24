import {
  BarChart3,
  Bot,
  Boxes,
  BrainCircuit,
  Cpu,
  Globe,
  ShieldCheck,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import type { ProjectCategory } from "@/lib/generated/prisma/enums";

/** Icon + token-based gradient per category (works in light and dark mode). */
export const PROJECT_CATEGORY_META: Record<ProjectCategory, { icon: LucideIcon; gradient: string }> = {
  WEB: { icon: Globe, gradient: "from-chart-1/30 via-chart-1/10 to-chart-2/25" },
  MOBILE: { icon: Smartphone, gradient: "from-chart-2/30 via-chart-2/10 to-chart-5/25" },
  AI_ML: { icon: BrainCircuit, gradient: "from-chart-4/30 via-chart-4/10 to-chart-1/25" },
  CYBER_SECURITY: { icon: ShieldCheck, gradient: "from-chart-5/30 via-chart-5/10 to-chart-2/25" },
  IOT: { icon: Cpu, gradient: "from-chart-3/30 via-chart-3/10 to-chart-5/25" },
  ROBOTICS: { icon: Bot, gradient: "from-chart-3/30 via-chart-3/10 to-chart-4/25" },
  DATA_SCIENCE: { icon: BarChart3, gradient: "from-chart-2/30 via-chart-2/10 to-chart-1/25" },
  OTHER: { icon: Boxes, gradient: "from-primary/25 via-primary/10 to-chart-4/20" },
};
