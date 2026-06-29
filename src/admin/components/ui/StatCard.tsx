import {
  UtensilsCrossed,
  Tag,
  CalendarDays,
  Image,
  Star,
  Users,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";
import AdminCard from "./Card";
import type { AdminStat } from "../../types";

const iconMap: Record<string, LucideIcon> = {
  utensils: UtensilsCrossed,
  tag: Tag,
  calendar: CalendarDays,
  image: Image,
  star: Star,
  users: Users,
};

export default function StatCard({ stat }: { stat: AdminStat }) {
  const { dark } = useAdminTheme();
  const Icon = iconMap[stat.icon] ?? Users;
  const TrendIcon = stat.trend === "down" ? TrendingDown : TrendingUp;

  return (
    <AdminCard className="group hover:shadow-admin-lg transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div
          className={[
            "flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-300",
            dark
              ? "bg-admin-primary/20 text-admin-gold group-hover:bg-admin-primary/30"
              : "bg-admin-primary/10 text-admin-primary group-hover:bg-admin-primary/15",
          ].join(" ")}
        >
          <Icon size={20} />
        </div>
        {stat.change && (
          <span
            className={[
              "inline-flex items-center gap-1 text-xs font-medium",
              stat.trend === "up"
                ? "text-admin-success"
                : stat.trend === "down"
                  ? "text-admin-danger"
                  : dark ? "text-white/50" : "text-admin-muted",
            ].join(" ")}
          >
            {stat.trend !== "neutral" && <TrendIcon size={12} />}
            {stat.change}
          </span>
        )}
      </div>
      <p className={`mt-4 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
        {stat.label}
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{stat.value}</p>
    </AdminCard>
  );
}
