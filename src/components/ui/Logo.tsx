import { LOGO, logoSrcForBackground, type LogoBackground } from "../../constants/logo";
import "./logo.css";

export type LogoSize = "navbar" | "hero" | "footer" | "inline";

export interface LogoProps {
  size?: LogoSize;
  /** `ivory` on light backgrounds; `dark` on black/transparent backgrounds */
  background?: LogoBackground;
  className?: string;
  priority?: boolean;
  hoverable?: boolean;
  /** Override default logo asset (e.g. from Supabase settings). */
  src?: string | null;
  alt?: string;
}

export default function Logo({
  size = "navbar",
  background = "ivory",
  className = "",
  priority = false,
  hoverable = false,
  src,
  alt = LOGO.alt,
}: LogoProps) {
  const imgClasses = [
    "logo",
    `logo--${size}`,
    hoverable ? "logo--hoverable" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const imageSrc = src?.trim() || logoSrcForBackground(background);

  return (
    <span className="logo-wrap">
      <img
        src={imageSrc}
        alt={alt}
        className={imgClasses}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        draggable={false}
      />
    </span>
  );
}
