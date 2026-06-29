import { useCallback, useEffect, useState } from "react";

const DEFAULT_ROOT_MARGIN = "300px 0px";

export interface NearViewportResult {
  ref: (node: HTMLElement | null) => void;
  near: boolean;
}

/**
 * Returns true once the observed element is within `rootMargin` of the viewport.
 */
export function useNearViewport(rootMargin = DEFAULT_ROOT_MARGIN): NearViewportResult {
  const [near, setNear] = useState(false);
  const [element, setElement] = useState<HTMLElement | null>(null);

  const ref = useCallback((node: HTMLElement | null) => {
    setElement(node);
  }, []);

  useEffect(() => {
    if (near || !element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0 },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [element, near, rootMargin]);

  return { ref, near };
}

export const VIEWPORT_PRELOAD_MARGIN = DEFAULT_ROOT_MARGIN;
