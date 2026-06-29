import type { ReactNode } from "react";
import { useAdminTheme } from "../../context/AdminThemeContext";
import AdminButton from "../ui/Button";
import { Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export default function PageHeader({
  title,
  description,
  actionLabel,
  onAction,
  children,
}: PageHeaderProps) {
  const { dark } = useAdminTheme();
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className={`mt-1 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
            {description}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {actionLabel && onAction && (
          <AdminButton onClick={onAction}>
            <Plus size={16} />
            {actionLabel}
          </AdminButton>
        )}
      </div>
    </div>
  );
}
