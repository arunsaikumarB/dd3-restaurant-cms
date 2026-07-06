import { motion } from "framer-motion";
import { RESERVATION_POLICIES } from "../../data/reservationPage";
import { usePageContent } from "../../context/PageContentContext";
import { EASE_POWER3, viewportOnce } from "../showcase/motion";

export default function ReservationPolicy() {
  const { fetchSection } = usePageContent();
  const section = fetchSection("reservation", "policies", {
    title: "Reservation Policy",
    subtitle: "A few helpful details so your evening runs seamlessly.",
    items: RESERVATION_POLICIES.map(({ title, description }) => ({ title, description })),
  });

  const policies = section.items.map((item, index) => ({
    id: RESERVATION_POLICIES[index]?.id ?? `policy-${index}`,
    title: item.title,
    description: item.description,
  }));

  return (
    <motion.section
      className="reservation-policy"
      aria-labelledby="reservation-policy-title"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.85, ease: EASE_POWER3 }}
    >
      <div className="reservation-policy__card">
        <header className="reservation-policy__header">
          <h2 id="reservation-policy-title" className="reservation-policy__title">
            {section.title}
          </h2>
          <p className="reservation-policy__subtitle">{section.subtitle}</p>
        </header>

        <div className="reservation-policy__grid">
          {policies.map((policy) => (
            <article key={policy.id} className="reservation-policy__item">
              <h3 className="reservation-policy__item-title">{policy.title}</h3>
              <p className="reservation-policy__item-desc">{policy.description}</p>
            </article>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
