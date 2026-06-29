import type { ReactNode } from "react";
import { useAdminTheme } from "../../context/AdminThemeContext";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "outline";

interface AdminBadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const lightStyles: Record<BadgeVariant, string> = {
  default: "bg-admin-ivory text-admin-text border-admin-border",
  success: "bg-green-50 text-admin-success border-green-200",
  warning: "bg-amber-50 text-admin-warning border-amber-200",
  danger: "bg-red-50 text-admin-danger border-red-200",
  info: "bg-orange-50 text-admin-orange border-orange-200",
  outline: "bg-transparent text-admin-muted border-admin-border",
};

const darkStyles: Record<BadgeVariant, string> = {
  default: "bg-white/10 text-white/80 border-white/10",
  success: "bg-green-500/15 text-green-400 border-green-500/20",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  danger: "bg-red-500/15 text-red-400 border-red-500/20",
  info: "bg-orange-500/15 text-admin-gold border-orange-500/20",
  outline: "bg-transparent text-white/60 border-white/15",
};

export default function AdminBadge({
  children,
  variant = "default",
  className = "",
}: AdminBadgeProps) {
  const { dark } = useAdminTheme();
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        dark ? darkStyles[variant] : lightStyles[variant],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
