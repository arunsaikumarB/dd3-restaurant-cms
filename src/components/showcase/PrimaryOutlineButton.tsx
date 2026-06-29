import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { EXTERNAL_ORDER_LINK_PROPS } from "../../constants/ordering";

export interface PrimaryOutlineButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  external?: boolean;
}

/**
 * Premium outline CTA — saffron hairline border that fills on hover.
 * Renders as a React Router Link for internal routes, an <a> for external URLs,
 * or a <button> when no href is provided.
 */
export default function PrimaryOutlineButton({
  children,
  href,
  onClick,
  className = "",
  external = href?.startsWith("http") ?? false,
}: PrimaryOutlineButtonProps) {
  const classes =
    "group relative inline-flex cursor-pointer items-center gap-3 overflow-hidden rounded-full " +
    "border border-saffron/70 px-8 py-3.5 text-[12px] font-medium uppercase " +
    "tracking-label text-cocoa transition-colors duration-500 ease-power3 " +
    "hover:text-ivory focus:outline-none focus-visible:ring-2 " +
    "focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-ivory " +
    className;

  const content = (
    <>
      <span
        aria-hidden
        className="absolute inset-0 -z-0 origin-left scale-x-0 bg-saffron transition-transform duration-500 ease-power3 group-hover:scale-x-100"
      />
      <span className="relative z-10">{children}</span>
      <span
        aria-hidden
        className="relative z-10 h-px w-6 bg-current transition-all duration-500 ease-power3 group-hover:w-9"
      />
    </>
  );

  if (href?.startsWith("/")) {
    return (
      <Link to={href} className={classes}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        className={classes}
        {...(external ? EXTERNAL_ORDER_LINK_PROPS : {})}
      >
        {content}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}
