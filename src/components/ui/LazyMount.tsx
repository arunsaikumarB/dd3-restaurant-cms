import { type ReactNode } from "react";
import { useNearViewport, VIEWPORT_PRELOAD_MARGIN } from "../../hooks/useNearViewport";
import SectionPlaceholder from "./SectionPlaceholder";

interface LazyMountProps {
  children: ReactNode;
  minHeight?: string;
  placeholderLabel?: string;
  dark?: boolean;
  rootMargin?: string;
  className?: string;
}

export default function LazyMount({
  children,
  minHeight = "50vh",
  placeholderLabel,
  dark = false,
  rootMargin = VIEWPORT_PRELOAD_MARGIN,
  className = "",
}: LazyMountProps) {
  const { ref, near } = useNearViewport(rootMargin);

  return (
    <div ref={ref} className={className}>
      {near ? (
        children
      ) : (
        <SectionPlaceholder
          label={placeholderLabel}
          minHeight={minHeight}
          dark={dark}
        />
      )}
    </div>
  );
}
