import type { LucideIcon } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";
import AdminButton from "./Button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function AdminEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { dark } = useAdminTheme();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className={[
          "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl",
          dark ? "bg-white/10 text-admin-gold" : "bg-admin-ivory text-admin-primary",
        ].join(" ")}
      >
        <Icon size={24} />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className={`mt-1 max-w-sm text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
        {description}
      </p>
      {actionLabel && onAction && (
        <AdminButton className="mt-6" onClick={onAction}>{actionLabel}</AdminButton>
      )}
    </div>
  );
}
