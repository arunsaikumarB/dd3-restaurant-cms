import type { ReactElement } from "react";
import { motion } from "framer-motion";
import { EXPERIENCE_FEATURES } from "../../data/atmosphereGallery";
import { EASE_POWER3 } from "../showcase/motion";

const ICONS: Record<(typeof EXPERIENCE_FEATURES)[number]["icon"], ReactElement> = {
  cuisine: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 10h16M6 10V6a2 2 0 012-2h8a2 2 0 012 2v4M8 14v4M12 14v4M16 14v4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  ingredients: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 20c6-1 11-6 12-12-6 1-11 6-12 12z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M6 20c2-4 6-8 12-12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  fresh: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v4l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  luxury: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 18h16M6 14l3-8h6l3 8M9 6V4h6v2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  hospitality: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20s-7-4.5-7-10a4 4 0 017-2 4 4 0 017 2c0 5.5-7 10-7 10z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export interface FeatureRowProps {
  visible?: boolean;
  features?: Array<{ title: string; description: string }>;
}

export default function FeatureRow({ visible = true, features }: FeatureRowProps) {
  const items = features ?? EXPERIENCE_FEATURES;

  return (
    <div className="exp-features">
      <div className="exp-features__row">
        {items.map((feature, index) => {
          const iconKey = EXPERIENCE_FEATURES[index]?.icon ?? "cuisine";
          return (
          <motion.div
            key={feature.title}
            className="exp-feature"
            initial={{ opacity: 0, y: 28 }}
            animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
            transition={{
              duration: 0.75,
              delay: 0.4 + index * 0.1,
              ease: EASE_POWER3,
            }}
          >
            <div className="exp-feature__icon">{ICONS[iconKey]}</div>
            <div>
              <h4 className="exp-feature__title">{feature.title}</h4>
              <p className="exp-feature__desc">{feature.description}</p>
            </div>
          </motion.div>
        );
        })}
      </div>
    </div>
  );
}
