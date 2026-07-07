import type { ReactNode } from "react";
import { useAdminTheme } from "../../context/AdminThemeContext";

interface AdminCardProps {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
  glass?: boolean;
  id?: string;
}

const paddingMap = { sm: "p-4", md: "p-6", lg: "p-8" };

export default function AdminCard({
  children,
  className = "",
  padding = "md",
  glass = false,
  id,
}: AdminCardProps) {
  const { dark } = useAdminTheme();
  return (
    <div
      id={id}
      className={[
        "rounded-2xl border transition-shadow duration-300",
        glass ? "admin-glass shadow-glass" : "shadow-admin",
        dark ? "border-admin-border-dark bg-admin-surface-dark" : "border-admin-border/60 bg-admin-surface",
        paddingMap[padding],
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
