import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";

interface Crumb {
  label: string;
  path?: string;
}

export default function AdminBreadcrumbs({ items }: { items: Crumb[] }) {
  const { dark } = useAdminTheme();
  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <ChevronRight size={14} className={dark ? "text-white/30" : "text-admin-muted/50"} />
          )}
          {item.path ? (
            <Link
              to={item.path}
              className={`transition-colors hover:text-admin-primary ${dark ? "text-white/50" : "text-admin-muted"}`}
            >
              {item.label}
            </Link>
          ) : (
            <span className={dark ? "text-white/80" : "text-admin-text"}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
