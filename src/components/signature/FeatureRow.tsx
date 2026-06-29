import type { ReactElement } from "react";
import { motion } from "framer-motion";
import { SIGNATURE_FEATURES } from "../../data/signatureDishes";

const ICONS: Record<(typeof SIGNATURE_FEATURES)[number]["icon"], ReactElement> = {
  leaf: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 20c6-1 11-6 12-12-6 1-11 6-12 12z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M6 20c2-4 6-8 12-12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  flame: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 22c4-2 6-5 6-9 0-3-2-5-4-7-1 2-3 3-4 5-1-3-1-6 2-9-4 2-6 6-6 10 0 4 2 7 6 10z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  star: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.8 5.7 21l2.3-7-6-4.6h7.6L12 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export interface FeatureRowProps {
  visible?: boolean;
}

export default function FeatureRow({ visible = true }: FeatureRowProps) {
  return (
    <div className="signature-features">
      {SIGNATURE_FEATURES.map((feature, index) => (
        <motion.div
          key={feature.title}
          className="signature-feature"
          initial={{ opacity: 0, y: 24 }}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          transition={{
            duration: 0.65,
            delay: 0.5 + index * 0.1,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div className="signature-feature__icon">{ICONS[feature.icon]}</div>
          <div>
            <h4 className="signature-feature__title">{feature.title}</h4>
            <p className="signature-feature__desc">{feature.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
