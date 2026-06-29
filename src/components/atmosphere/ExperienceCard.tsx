import { useState } from "react";
import { motion } from "framer-motion";
import { EASE_POWER3 } from "../showcase/motion";

export interface ExperienceCardProps {
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
  index?: number;
  visible?: boolean;
}

export default function ExperienceCard({
  title,
  subtitle,
  image,
  imageAlt,
  index = 0,
  visible = true,
}: ExperienceCardProps) {
  const [hovered, setHovered] = useState(false);

  const stateClass = [
    "exp-card",
    visible && "is-visible",
    hovered && "is-hovered",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.article
      className={stateClass}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ opacity: 0, y: 48 }}
      animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 48 }}
      transition={{
        duration: 0.75,
        delay: index * 0.1,
        ease: EASE_POWER3,
      }}
    >
      <div className="exp-card__media">
          <img
            src={image}
            alt={imageAlt}
            className="exp-card__image"
            loading="lazy"
            decoding="async"
            sizes="(max-width: 768px) 80vw, (max-width: 1200px) 25vw, 280px"
            draggable={false}
          />
        <div className="exp-card__overlay" aria-hidden />
      </div>

      <div className="exp-card__content">
        <h3 className="exp-card__title">{title}</h3>
        <p className="exp-card__subtitle">{subtitle}</p>
      </div>

      <span className="exp-card__arrow" aria-hidden>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path
            d="M7 17L17 7M17 7H9M17 7v8"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </motion.article>
  );
}
