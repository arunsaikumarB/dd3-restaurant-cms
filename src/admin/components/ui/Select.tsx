import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";

interface SelectOption {
  value: string;
  label: string;
}

interface AdminSelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
}

export default function AdminSelect({
  label,
  value,
  onChange,
  options,
  placeholder = "Select...",
}: AdminSelectProps) {
  const { dark } = useAdminTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative space-y-1.5">
      {label && (
        <span className={`block text-sm font-medium ${dark ? "text-white/80" : "text-admin-text/80"}`}>
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex h-10 w-full items-center justify-between rounded-xl border px-3.5 text-sm",
          dark
            ? "border-admin-border-dark bg-white/5 text-white"
            : "border-admin-border bg-white text-admin-text",
        ].join(" ")}
      >
        <span className={!selected ? "opacity-50" : ""}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className={[
            "absolute z-50 mt-1 w-full overflow-hidden rounded-xl border shadow-admin-lg",
            dark ? "border-admin-border-dark bg-admin-surface-dark" : "border-admin-border bg-white",
          ].join(" ")}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={[
                "flex w-full px-3.5 py-2.5 text-left text-sm transition-colors",
                opt.value === value
                  ? "bg-admin-primary/10 text-admin-primary"
                  : dark ? "hover:bg-white/5" : "hover:bg-admin-ivory",
              ].join(" ")}
              onClick={() => { onChange(opt.value); setOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
