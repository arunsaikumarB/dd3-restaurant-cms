import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  containerVariants,
  dividerItem,
  fadeUpItem,
  viewportOnce,
} from "./motion";

export interface SectionHeaderProps {
  /** Small uppercase category label, e.g. "AUTHENTIC INDIAN CUISINE". */
  subtitle: string;
  /** Large elegant heading. */
  title: string;
  /** Short descriptive paragraph. */
  description: string;
  /** Show the decorative divider beneath the heading (default true). */
  divider?: boolean;
  /** Optional trailing slot (e.g. a CTA) included in the staggered reveal. */
  children?: ReactNode;
}

/**
 * Editorial header block: category label, serif heading, optional divider,
 * supporting paragraph and an optional CTA slot. Acts as the stagger
 * orchestrator so each element fades up 100ms after the previous one.
 */
export default function SectionHeader({
  subtitle,
  title,
  description,
  divider = true,
  children,
}: SectionHeaderProps) {
  return (
    <motion.div
      className="max-w-xl"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
    >
      <motion.p
        variants={fadeUpItem}
        className="mb-5 text-[12px] font-semibold uppercase tracking-label text-saffron"
      >
        {subtitle}
      </motion.p>

      <motion.h2
        variants={fadeUpItem}
        className="font-serif text-[clamp(2.25rem,4.5vw,4rem)] font-semibold leading-[1.05] tracking-tight text-cocoa"
      >
        {title}
      </motion.h2>

      {divider && (
        <motion.span
          variants={dividerItem}
          className="mt-7 block h-px w-16 origin-left bg-saffron/70"
        />
      )}

      <motion.p
        variants={fadeUpItem}
        className="mt-7 max-w-md text-[17px] leading-relaxed text-cocoa/65"
      >
        {description}
      </motion.p>

      {children && (
        <motion.div variants={fadeUpItem} className="mt-9">
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}
