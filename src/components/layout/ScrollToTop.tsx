import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function scrollToHash(hash: string): boolean {
  const el = document.querySelector(hash);
  if (el) {
    el.scrollIntoView({ behavior: "smooth" });
    return true;
  }
  return false;
}

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      if (scrollToHash(hash)) return;

      const timers = [100, 350, 700].map((delay) =>
        window.setTimeout(() => scrollToHash(hash), delay),
      );
      return () => timers.forEach((id) => window.clearTimeout(id));
    }

    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
