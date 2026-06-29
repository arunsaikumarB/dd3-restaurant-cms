import { forwardRef, type ButtonHTMLAttributes } from "react";
import { useAdminTheme } from "../../context/AdminThemeContext";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
}

const variants: Record<Variant, string> = {
  primary:
    "bg-admin-primary text-white hover:bg-admin-orange shadow-admin hover:shadow-admin-lg",
  secondary:
    "bg-admin-gold text-white hover:opacity-90 shadow-admin",
  outline:
    "border border-admin-border bg-transparent hover:bg-admin-ivory/50",
  ghost: "bg-transparent hover:bg-black/5",
  danger: "bg-admin-danger text-white hover:opacity-90",
};

const darkVariants: Record<Variant, string> = {
  primary: "bg-admin-primary text-white hover:bg-admin-orange",
  secondary: "bg-admin-gold text-white hover:opacity-90",
  outline: "border-admin-border-dark hover:bg-white/5",
  ghost: "hover:bg-white/5",
  danger: "bg-admin-danger text-white",
};

const sizes = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-sm gap-2",
};

const AdminButton = forwardRef<HTMLButtonElement, AdminButtonProps>(
  ({ variant = "primary", size = "md", className = "", children, ...props }, ref) => {
    const { dark } = useAdminTheme();
    return (
      <button
        ref={ref}
        className={[
          "inline-flex items-center justify-center rounded-xl font-medium transition-all duration-300",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-admin-orange focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:pointer-events-none",
          sizes[size],
          dark ? darkVariants[variant] : variants[variant],
          className,
        ].join(" ")}
        {...props}
      >
        {children}
      </button>
    );
  },
);

AdminButton.displayName = "AdminButton";
export default AdminButton;
