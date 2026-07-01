import { motion } from "framer-motion";
import { RESERVATION_FEATURES } from "../../data/reservationPage";
import { usePageContent } from "../../context/PageContentContext";
import SectionHeading from "../ui/SectionHeading";
import {
  containerVariants,
  EASE_POWER3,
  fadeUpItem,
  viewportOnce,
} from "../showcase/motion";

const featureIcons = {
  cuisine: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M6 3v8a4 4 0 008 0V3M10 11v10M14 3v8a4 4 0 008 0V3M18 11v10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  luxury: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 18h16M6 18V9l6-5 6 5v9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 14h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  events: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 14h2v2H8v-2z" fill="currentColor" />
    </svg>
  ),
  family: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
};

export default function FeatureCards() {
  const { fetchSection } = usePageContent();
  const section = fetchSection("reservation", "features", {
    eyebrow: "Why Reserve",
    title: "An Experience Worth Savouring",
    subtitle:
      "From the first welcome to the final course, every detail is crafted for memorable dining.",
    items: RESERVATION_FEATURES.map(({ title, description }) => ({ title, description })),
  });

  const features = section.items.map((item, index) => {
    const fallback = RESERVATION_FEATURES[index];
    return {
      id: fallback?.id ?? `feature-${index}`,
      title: item.title,
      description: item.description,
      icon: fallback?.icon ?? "cuisine",
    };
  });

  return (
    <section className="reservation-features" aria-labelledby="why-reserve-title">
      <div className="reservation-features__inner">
        <SectionHeading
          eyebrow={section.eyebrow}
          title={section.title}
          subtitle={section.subtitle}
          align="center"
        />

        <motion.div
          className="reservation-features__grid"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {features.map((feature) => (
            <motion.article
              key={feature.id}
              className="reservation-feature"
              variants={fadeUpItem}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.45, ease: EASE_POWER3 }}
            >
              <div className="reservation-feature__icon">
                {featureIcons[feature.icon as keyof typeof featureIcons]}
              </div>
              <h3 className="reservation-feature__title">{feature.title}</h3>
              <p className="reservation-feature__desc">{feature.description}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
