import { motion } from "framer-motion";
import { ABOUT_FEATURES } from "../../data/aboutSection";
import {
  containerVariants,
  EASE_POWER3,
  fadeUpItem,
  viewportOnce,
} from "../showcase/motion";

const icons = {
  recipes: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 3v8a4 4 0 008 0V3M10 11v10M14 3v8a4 4 0 008 0V3M18 11v10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  ingredients: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3c-1.5 3-4 5.5-4 9a4 4 0 008 0c0-3.5-2.5-6-4-9z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M12 14v7M9 18h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  family: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M3 20c0-3.5 2.5-5 6-5M14 20c0-2.5 1.5-4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  halal: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l1.5 4.5H18l-3.5 2.5 1.5 4.5L12 12l-4 2.5 1.5-4.5L6 7.5h4.5L12 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="17" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

export default function FeatureList() {
  return (
    <motion.ul
      className="about-features"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      aria-label="Restaurant highlights"
    >
      {ABOUT_FEATURES.map((feature) => (
        <motion.li
          key={feature.id}
          className="about-features__item"
          variants={fadeUpItem}
          whileHover={{ y: -4 }}
          transition={{ duration: 0.45, ease: EASE_POWER3 }}
        >
          <span className="about-features__icon">{icons[feature.icon]}</span>
          <span className="about-features__label">{feature.title}</span>
        </motion.li>
      ))}
    </motion.ul>
  );
}
