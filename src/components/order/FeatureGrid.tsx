import type { ReactElement } from "react";
import { motion } from "framer-motion";
import { ORDER_FEATURES } from "../../data/orderPage";
import { EASE_POWER3, viewportOnce } from "../showcase/motion";

const ICONS: Record<(typeof ORDER_FEATURES)[number]["icon"], ReactElement> = {
  fresh: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 20c6-1 11-6 12-12-6 1-11 6-12 12z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M6 20c2-4 6-8 12-12" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  pricing: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3v18M8 7c0-2 1.8-3 4-3s4 1 4 3-1.8 3-4 3-4 1-4 3 1.8 3 4 3 4-1 4-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  pickup: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v4l2.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  offers: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.8 5.7 21l2.3-7-6-4.6h7.6L12 2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export default function FeatureGrid() {
  return (
    <section className="order-features" aria-labelledby="order-features-title">
      <div className="order-page__texture" aria-hidden />
      <div className="order-features__inner">
        <motion.header
          className="order-features__header"
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.85, ease: EASE_POWER3 }}
        >
          <p className="order-features__eyebrow">Why Order Direct</p>
          <h2 id="order-features-title" className="order-features__title">
            The Desi Dhamaka Difference
          </h2>
        </motion.header>

        <div className="order-features__grid">
          {ORDER_FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="order-feature"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{
                duration: 0.75,
                delay: index * 0.1,
                ease: EASE_POWER3,
              }}
            >
              <div className="order-feature__icon">{ICONS[feature.icon]}</div>
              <h3 className="order-feature__title">{feature.title}</h3>
              <p className="order-feature__desc">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
