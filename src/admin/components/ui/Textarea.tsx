import { forwardRef, type TextareaHTMLAttributes } from "react";
import { useAdminTheme } from "../../context/AdminThemeContext";

interface AdminTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

const AdminTextarea = forwardRef<HTMLTextAreaElement, AdminTextareaProps>(
  ({ label, className = "", id, ...props }, ref) => {
    const { dark } = useAdminTheme();
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className={`block text-sm font-medium ${dark ? "text-white/80" : "text-admin-text/80"}`}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={[
            "min-h-[100px] w-full rounded-xl border px-3.5 py-2.5 text-sm transition-all duration-200 resize-y",
            "focus:outline-none focus:ring-2 focus:ring-admin-orange/30 focus:border-admin-orange",
            dark
              ? "border-admin-border-dark bg-white/5 text-white placeholder:text-white/40"
              : "border-admin-border bg-white text-admin-text placeholder:text-admin-muted/60",
            className,
          ].join(" ")}
          {...props}
        />
      </div>
    );
  },
);

AdminTextarea.displayName = "AdminTextarea";
export default AdminTextarea;
