import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function AdminPagination({ page, totalPages, onPageChange }: PaginationProps) {
  const { dark } = useAdminTheme();
  const btnClass = [
    "flex h-9 w-9 items-center justify-center rounded-lg border text-sm transition-colors",
    dark
      ? "border-admin-border-dark hover:bg-white/5 disabled:opacity-40"
      : "border-admin-border hover:bg-admin-ivory disabled:opacity-40",
  ].join(" ");

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={btnClass}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
        <button
          key={p}
          type="button"
          className={[
            btnClass,
            p === page ? "border-admin-primary bg-admin-primary text-white" : "",
          ].join(" ")}
          onClick={() => onPageChange(p)}
        >
          {p}
        </button>
      ))}
      <button
        type="button"
        className={btnClass}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
