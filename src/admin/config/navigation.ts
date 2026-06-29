import {
  LayoutDashboard,
  Home,
  UtensilsCrossed,
  FolderOpen,
  Tag,
  Images,
  CalendarDays,
  Star,
  Settings,
  User,
  LogIn,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AdminNavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Homepage", path: "/admin/homepage", icon: Home },
  { label: "Menu", path: "/admin/menu", icon: UtensilsCrossed },
  { label: "Categories", path: "/admin/categories", icon: FolderOpen },
  { label: "Offers", path: "/admin/offers", icon: Tag },
  { label: "Gallery", path: "/admin/gallery", icon: Images },
  { label: "Reservations", path: "/admin/reservations", icon: CalendarDays },
  { label: "Reviews", path: "/admin/reviews", icon: Star },
  { label: "Settings", path: "/admin/settings", icon: Settings },
  { label: "Profile", path: "/admin/profile", icon: User },
];

export const ADMIN_LOGIN_PATH = "/admin/login";

export { LogIn };
