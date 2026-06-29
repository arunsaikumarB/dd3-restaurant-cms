import { useRef } from "react";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { EASE_POWER3 } from "./motion";

export interface AnimatedImageProps {
  src: string;
  alt: string;
  className?: string;
}

// Reveal the framed image with a soft vertical clip-path wipe + fade.
// Rounded corners come from the container's `rounded-[24px] overflow-hidden`,
// so the clip-path stays free of the `round` keyword (which Framer Motion
// can fail to interpolate).
const frameReveal: Variants = {
  hidden: { clipPath: "inset(0% 0% 100% 0%)", opacity: 0 },
  visible: {
    clipPath: "inset(0% 0% 0% 0%)",
    opacity: 1,
    transition: { duration: 1, ease: EASE_POWER3 },
  },
};

// Settle the photo from a gentle overscale to its natural size.
const imageScale: Variants = {
  hidden: { scale: 1.05 },
  visible: {
    scale: 1,
    transition: { duration: 1.1, ease: EASE_POWER3 },
  },
};

/**
 * Premium food image: rounded 24px frame, subtle shadow, clip-path reveal,
 * 1.05 -> 1.0 entrance scale and a gentle scroll-driven parallax.
 *
 * Visibility is driven by the `useInView` hook + `animate` (rather than the
 * `whileInView` prop) because the sibling `useScroll` parallax layer can
 * otherwise suppress prop-based in-view detection.
 */
export default function AnimatedImage({
  src,
  alt,
  className = "",
}: AnimatedImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // Subtle parallax — the oversized inner layer keeps edges covered.
  const y = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);

  return (
    <div
      ref={ref}
      className={
        "relative aspect-[4/3] w-full overflow-hidden rounded-[24px] " +
        "shadow-premium " +
        className
      }
    >
      {/* Parallax layer — owns ONLY the scroll-driven transform. */}
      <motion.div
        style={{ y }}
        className="absolute inset-x-0 -top-[10%] h-[120%] will-change-transform"
      >
        {/* Reveal layer — clip-path + fade, triggered when in view. */}
        <motion.div
          variants={frameReveal}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="h-full w-full will-change-transform"
        >
          <motion.img
            variants={imageScale}
            src={src}
            alt={alt}
            decoding="async"
            className="h-full w-full object-cover"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
