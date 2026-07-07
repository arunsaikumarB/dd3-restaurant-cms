import { useEffect, type RefObject } from "react";

export function useAutoScroll(
  ref: RefObject<HTMLElement | null>,
  deps: unknown[],
  enabled = true,
) {
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const el = ref.current;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 120;

    if (nearBottom || el.scrollTop === 0) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls scroll triggers
  }, deps);
}
