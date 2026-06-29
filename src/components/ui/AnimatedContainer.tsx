import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE_POWER3 } from "../showcase/motion";

interface AnimatedContainerProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function AnimatedContainer({
  children,
  className = "",
  delay = 0,
}: AnimatedContainerProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.75,
        ease: EASE_POWER3,
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}
