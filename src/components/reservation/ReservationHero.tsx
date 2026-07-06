import { useState } from "react";
import { motion } from "framer-motion";
import { RESERVATION_HERO_FEATURES } from "../../data/reservationPage";
import { usePageContent } from "../../context/PageContentContext";
import { EASE_POWER3 } from "../showcase/motion";

const featureIcons = {
  cuisine: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 3v8a4 4 0 008 0V3M10 11v10M14 3v8a4 4 0 008 0V3M18 11v10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  family: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 20c0-3.5 2.5-5 6-5M14 20c0-2.5 1.5-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  ingredients: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3c2 3 4 5 4 8a4 4 0 01-8 0c0-3 2-5 4-8z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 14v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  reservations: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

const HERO_BG = "/reservation/south-plainfield-hero.webp";

export default function ReservationHero() {
  const [loaded, setLoaded] = useState(false);
  const { fetchSection } = usePageContent();

  const hero = fetchSection("reservation", "hero", {
    eyebrow: "AUTHENTIC INDIAN DINING",
    title: "Reserve Your Table",
    subtitle:
      "Experience authentic Indian cuisine with exceptional hospitality in South Plainfield.",
    features: RESERVATION_HERO_FEATURES.map(({ title }) => ({ title })),
  });

  const features = hero.features.map((item, index) => ({
    id: RESERVATION_HERO_FEATURES[index]?.id ?? `hero-feat-${index}`,
    title: item.title,
    icon: RESERVATION_HERO_FEATURES[index]?.icon ?? "cuisine",
  }));

  const scrollToBooking = () => {
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      className="reservation-hero reservation-hero--premium"
      aria-label="Reserve your table at Desi Dhamaka South Plainfield"
    >
      <div className="reservation-hero__bg" aria-hidden>
        <img
          src={HERO_BG}
          alt=""
          className="reservation-hero__bg-image"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          onLoad={() => setLoaded(true)}
        />
        <div className="reservation-hero__overlay" />
      </div>

      <div className="reservation-hero__content">
        <motion.div
          className="reservation-hero__copy"
          initial={{ opacity: 0, y: 32 }}
          animate={loaded ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 1, ease: EASE_POWER3 }}
        >
          <p className="reservation-hero__eyebrow">{hero.eyebrow}</p>
          <h1 className="reservation-hero__title">{hero.title}</h1>
          <p className="reservation-hero__subtitle">{hero.subtitle}</p>

          <ul className="reservation-hero__features">
            {features.map((feature, index) => (
              <motion.li
                key={feature.id}
                className="reservation-hero__feature"
                initial={{ opacity: 0, y: 16 }}
                animate={loaded ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, ease: EASE_POWER3, delay: 0.15 + index * 0.08 }}
              >
                <span className="reservation-hero__feature-icon">
                  {featureIcons[feature.icon as keyof typeof featureIcons]}
                </span>
                <span className="reservation-hero__feature-label">{feature.title}</span>
              </motion.li>
            ))}
          </ul>

          <button type="button" className="reservation-hero__cta" onClick={scrollToBooking}>
            Reserve Table
          </button>
        </motion.div>
      </div>

      <div className="reservation-hero__curve" aria-hidden>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="reservation-hero__curve-svg">
          <path d="M0,48 C360,96 1080,0 1440,48 L1440,80 L0,80 Z" fill="#f8f5f0" />
        </svg>
      </div>
    </section>
  );
}
