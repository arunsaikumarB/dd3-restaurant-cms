import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE_POWER3 } from "../showcase/motion";

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5, ease: EASE_POWER3 }}
    >
      {children}
    </motion.div>
  );
}
