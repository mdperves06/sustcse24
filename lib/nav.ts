import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Briefcase,
  Cake,
  Calendar,
  CalendarDays,
  FolderGit2,
  IdCard,
  LayoutDashboard,
  Megaphone,
  MessagesSquare,
  Network,
  Settings,
  Shield,
  User,
  UserPlus,
  Users,
  UsersRound,
  Vote,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";

export type NavItem = { href: string; label: string; icon: LucideIcon; permission?: Permission };
export type NavSection = { title: string; items: NavItem[] };

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/feed", label: "Community Feed", icon: MessagesSquare },
      { href: "/directory", label: "Batch Directory", icon: Users },
      { href: "/announcements", label: "Announcements", icon: Megaphone },
    ],
  },
  {
    title: "Batch life",
    items: [
      { href: "/events", label: "Events", icon: CalendarDays },
      { href: "/calendar", label: "Calendar", icon: Calendar },
      { href: "/groups", label: "Interest Groups", icon: UsersRound },
      { href: "/polls", label: "Polls", icon: Vote },
      { href: "/birthdays", label: "Birthdays", icon: Cake },
    ],
  },
  {
    title: "Grow",
    items: [
      { href: "/resources", label: "Academic Resources", icon: BookOpen },
      { href: "/opportunities", label: "Opportunities", icon: Briefcase },
      { href: "/projects", label: "Project Gallery", icon: FolderGit2 },
      { href: "/teammates", label: "Find a Teammate", icon: UserPlus },
      { href: "/achievements", label: "Hall of Fame", icon: Award },
      { href: "/careers", label: "Career Network", icon: Network },
      { href: "/skills", label: "Skill Map", icon: BarChart3 },
    ],
  },
  {
    title: "You",
    items: [
      { href: "/profile", label: "My Profile", icon: User },
      { href: "/id-card", label: "Digital ID", icon: IdCard },
      { href: "/notifications", label: "Notifications", icon: Bell },
      { href: "/assistant", label: "AI Assistant", icon: Bot },
      { href: "/settings", label: "Settings", icon: Settings },
      { href: "/admin", label: "Admin Panel", icon: Shield, permission: "admin.access" },
    ],
  },
];

/** Primary destinations for the mobile bottom bar. */
export const MOBILE_TABS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/feed", label: "Feed", icon: MessagesSquare },
  { href: "/directory", label: "Batch", icon: Users },
  { href: "/events", label: "Events", icon: CalendarDays },
];
