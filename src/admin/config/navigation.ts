import {
  LayoutDashboard,
  LineChart,
  Home,
  FileText,
  Tag,
  Images,
  Settings,
  Search,
  User,
  LogIn,
  PlugZap,
  Bot,
  BookOpen,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AdminNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface AdminNavSection {
  title?: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    items: [
      { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
      { label: "Insights", path: "/admin/insights", icon: LineChart },
      { label: "Homepage", path: "/admin/homepage", icon: Home },
      { label: "Pages", path: "/admin/pages", icon: FileText },
      { label: "SEO Summary", path: "/admin/seo-summary", icon: Search },
    ],
  },
  {
    items: [
      { label: "Offers", path: "/admin/offers", icon: Tag },
      { label: "Gallery", path: "/admin/gallery", icon: Images },
      { label: "Settings", path: "/admin/settings", icon: Settings },
    ],
  },
  {
    title: "Integrations",
    items: [
      { label: "ChefGaa Integration", path: "/admin/integrations/chefgaa", icon: PlugZap },
      { label: "AI Concierge", path: "/admin/integrations/ai-concierge", icon: Bot },
      { label: "Knowledge Base", path: "/admin/integrations/knowledge-base", icon: BookOpen },
    ],
  },
  {
    items: [{ label: "Profile", path: "/admin/profile", icon: User }],
  },
];

/** Flat list of all admin nav items (for helpers and tests). */
export const ADMIN_NAV: AdminNavItem[] = ADMIN_NAV_SECTIONS.flatMap((section) => section.items);

export const ADMIN_LOGIN_PATH = "/admin/login";

export { LogIn };
