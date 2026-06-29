import { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";

interface ActionMenuProps {
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ActionMenu({ onEdit, onDelete }: ActionMenuProps) {
  const { dark } = useAdminTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          dark ? "hover:bg-white/10" : "hover:bg-admin-ivory",
        ].join(" ")}
        aria-label="Actions"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div
          className={[
            "absolute right-0 z-50 mt-1 min-w-[140px] overflow-hidden rounded-xl border shadow-admin-lg",
            dark ? "border-admin-border-dark bg-admin-surface-dark" : "border-admin-border bg-white",
          ].join(" ")}
        >
          {onEdit && (
            <button
              type="button"
              className={`flex w-full items-center gap-2 px-3 py-2 text-sm ${dark ? "hover:bg-white/5" : "hover:bg-admin-ivory"}`}
              onClick={() => { onEdit(); setOpen(false); }}
            >
              <Pencil size={14} /> Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-admin-danger hover:bg-red-50"
              onClick={() => { onDelete(); setOpen(false); }}
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
