import { Link } from "react-router-dom";
import type { MouseEvent, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost";

export interface ButtonProps {
  children: ReactNode;
  href?: string;
  to?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  variant?: Variant;
  className?: string;
  type?: "button" | "submit";
  light?: boolean;
  disabled?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-primary text-ivory border-2 border-brand-primary hover:bg-brand-primary/90 hover:border-brand-primary/90 shadow-[0_4px_16px_-4px_rgba(237,60,24,0.45)] hover:shadow-[0_8px_24px_-6px_rgba(237,60,24,0.55)] hover:-translate-y-[3px]",
  outline:
    "border-2 border-brand-primary text-brand-primary bg-transparent hover:bg-brand-primary hover:text-ivory hover:shadow-[0_8px_24px_-6px_rgba(237,60,24,0.4)] hover:-translate-y-[3px]",
  ghost:
    "border border-cocoa/15 text-cocoa hover:border-brand-primary hover:text-brand-primary hover:-translate-y-[2px] bg-transparent",
};

export default function Button({
  children,
  href,
  to,
  onClick,
  variant = "primary",
  className = "",
  type = "button",
  light = false,
  disabled = false,
}: ButtonProps) {
  const base =
    "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full h-[44px] px-6 text-[11px] font-bold uppercase tracking-[0.14em] transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap";

  const lightOutline =
    light && variant === "outline"
      ? "border-ivory/70 text-ivory hover:bg-ivory hover:text-cocoa hover:border-ivory"
      : "";

  const classes = `${base} ${variants[variant]} ${lightOutline} ${className}`;

  if (to) {
    return (
      <Link to={to} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        onClick={onClick}
        {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes} disabled={disabled}>
      {children}
    </button>
  );
}
