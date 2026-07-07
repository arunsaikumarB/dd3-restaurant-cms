import { motion } from "framer-motion";
import type { OrderOption } from "../../data/orderPage";
import { EASE_POWER3, viewportOnce } from "../showcase/motion";

export interface OrderOptionCardProps {
  option: OrderOption;
  index?: number;
}

export default function OrderOptionCard({ option, index = 0 }: OrderOptionCardProps) {
  return (
    <motion.article
      className={`order-card order-card--${option.variant}`}
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{
        duration: 0.85,
        delay: index * 0.12,
        ease: EASE_POWER3,
      }}
    >
      <div className="order-card__logo-wrap">
        <img
          src={option.image}
          alt={option.imageAlt}
          className="order-card__logo"
          loading="lazy"
          decoding="async"
        />
      </div>

      <div className="order-card__divider" aria-hidden />

      <div className="order-card__body">
        <h2 className="sr-only">{option.title}</h2>
        <p className="order-card__desc">{option.description}</p>

        <span
          className={
            option.variant === "desi"
              ? "order-card__badge order-card__badge--accent"
              : "order-card__badge"
          }
        >
          {option.badge}
        </span>

        <a
          href={option.buttonHref}
          className="order-card__cta"
          target="_blank"
          rel="noopener noreferrer"
        >
          {option.buttonText}
          <span className="order-card__cta-arrow" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </a>
      </div>
    </motion.article>
  );
}
