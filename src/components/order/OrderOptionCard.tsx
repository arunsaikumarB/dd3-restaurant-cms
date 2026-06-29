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
      className="order-card"
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{
        duration: 0.85,
        delay: index * 0.12,
        ease: EASE_POWER3,
      }}
    >
      <div className="order-card__media">
        <img
          src={option.image}
          alt={option.imageAlt}
          className="order-card__image"
          loading="lazy"
          decoding="async"
        />
        <div className="order-card__media-overlay" aria-hidden />
      </div>

      <div className="order-card__body">
        <div className="order-card__head">
          <h2 className="order-card__title">{option.title}</h2>
          <span
            className={
              option.variant === "uber"
                ? "order-card__badge order-card__badge--uber"
                : "order-card__badge"
            }
          >
            {option.badge}
          </span>
        </div>

        <p className="order-card__desc">{option.description}</p>

        <div className="order-card__pills">
          {option.pills.map((pill) => (
            <span key={pill} className="order-card__pill">
              {pill}
            </span>
          ))}
        </div>

        <a
          href={option.buttonHref}
          className="order-card__cta"
          style={{ backgroundColor: option.buttonColor }}
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
