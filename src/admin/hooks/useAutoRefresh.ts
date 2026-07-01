import { useEffect, useRef } from "react";

/**
 * Polls `callback` on an interval. Uses a ref so the latest callback runs without
 * resetting the timer when dependencies change.
 */
export function useAutoRefresh(
  callback: () => void | Promise<void>,
  intervalMs = 60_000,
  enabled = true,
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      void callbackRef.current();
    };

    const intervalId = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(intervalId);
  }, [intervalMs, enabled]);
}
