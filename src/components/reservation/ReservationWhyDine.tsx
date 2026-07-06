import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { RESERVATION_WHY_DINE } from "../../data/reservationPage";
import { usePageContent } from "../../context/PageContentContext";
import { useLocationSelection } from "../../context/LocationContext";
import { locPath } from "../../utils/locationPaths";
import { EASE_POWER3, fadeUpItem, viewportOnce } from "../showcase/motion";

const whyIcons = {
  cuisine: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 3v8a4 4 0 008 0V3M10 11v10M14 3v8a4 4 0 008 0V3M18 11v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  ingredients: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3c2 3 4 5 4 8a4 4 0 01-8 0c0-3 2-5 4-8z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 14v7M9 21h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  hospitality: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 21s-6-4.5-6-10a6 6 0 1112 0c0 5.5-6 10-6 10z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 9v4M10 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  private: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 18h16M6 18V9l6-5 6 5v9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

export default function ReservationWhyDine() {
  const { fetchSection } = usePageContent();
  const { selectedLocationId } = useLocationSelection();
  const section = fetchSection("reservation", "why_dine", {
    title: "Why Dine With Us",
    cateringTitle: "Planning a Special Event?",
    cateringText:
      "From intimate gatherings to grand celebrations, our catering team crafts unforgettable Indian feasts tailored to your occasion.",
    cateringCta: "Explore Catering",
    items: RESERVATION_WHY_DINE.map(({ title, description }) => ({ title, description })),
  });

  const reasons = section.items.map((item, index) => {
    const fallback = RESERVATION_WHY_DINE[index];
    return {
      id: fallback?.id ?? `why-${index}`,
      title: item.title,
      description: item.description,
      icon: fallback?.icon ?? "cuisine",
    };
  });

  return (
    <motion.aside
      className="reservation-why"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.9, ease: EASE_POWER3, delay: 0.15 }}
      aria-labelledby="why-dine-title"
    >
      <div className="reservation-why__card">
        <h2 id="why-dine-title" className="reservation-why__title">
          {section.title}
        </h2>

        <ul className="reservation-why__list">
          {reasons.map((reason, index) => (
            <motion.li
              key={reason.id}
              className="reservation-why__item"
              variants={fadeUpItem}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
              transition={{ delay: index * 0.08 }}
            >
              <span className="reservation-why__icon">
                {whyIcons[reason.icon as keyof typeof whyIcons]}
              </span>
              <div>
                <h3 className="reservation-why__item-title">{reason.title}</h3>
                <p className="reservation-why__item-desc">{reason.description}</p>
              </div>
            </motion.li>
          ))}
        </ul>

        <div className="reservation-why__catering">
          <p className="reservation-why__catering-eyebrow">Catering</p>
          <h3 className="reservation-why__catering-title">{section.cateringTitle}</h3>
          <p className="reservation-why__catering-text">{section.cateringText}</p>
          <Link
            to={locPath(selectedLocationId, "/catering")}
            className="reservation-why__catering-btn"
          >
            {section.cateringCta}
          </Link>
        </div>
      </div>
    </motion.aside>
  );
}
