import type { Variants } from "framer-motion";

/** Cubic-bezier approximation of GSAP's power3.out. */
export const EASE_POWER3 = [0.215, 0.61, 0.355, 1] as const;

/** Parent container: reveals children with a 100ms stagger when in view. */
export const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

/** Fade-up used by label, heading, paragraph and button. */
export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE_POWER3 },
  },
};

/** Decorative divider grows horizontally. */
export const dividerItem: Variants = {
  hidden: { opacity: 0, scaleX: 0 },
  visible: {
    opacity: 1,
    scaleX: 1,
    transition: { duration: 0.8, ease: EASE_POWER3 },
  },
};

/** Shared viewport config so sections animate once on enter. */
export const viewportOnce = { once: true, amount: 0.25 } as const;

/** Respects OS reduced-motion preference. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
