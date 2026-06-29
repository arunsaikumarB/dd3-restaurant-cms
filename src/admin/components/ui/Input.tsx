import { forwardRef, type InputHTMLAttributes } from "react";
import { useAdminTheme } from "../../context/AdminThemeContext";

interface AdminInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const AdminInput = forwardRef<HTMLInputElement, AdminInputProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const { dark } = useAdminTheme();
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className={`block text-sm font-medium ${dark ? "text-white/80" : "text-admin-text/80"}`}
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            "h-10 w-full rounded-xl border px-3.5 text-sm transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-admin-orange/30 focus:border-admin-orange",
            dark
              ? "border-admin-border-dark bg-white/5 text-white placeholder:text-white/40"
              : "border-admin-border bg-white text-admin-text placeholder:text-admin-muted/60",
            error ? "border-admin-danger" : "",
            className,
          ].join(" ")}
          {...props}
        />
        {error && <p className="text-xs text-admin-danger">{error}</p>}
      </div>
    );
  },
);

AdminInput.displayName = "AdminInput";
export default AdminInput;
