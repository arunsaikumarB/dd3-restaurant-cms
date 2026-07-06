import { motion } from "framer-motion";
import { RESERVATION_TIMELINE } from "../../data/reservationPage";
import { usePageContent } from "../../context/PageContentContext";
import { EASE_POWER3, viewportOnce } from "../showcase/motion";

const stepIcons = [
  (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12l4 4L19 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3l2.2 4.5 5 .7-3.6 3.5.9 5L12 14.8 7.5 16.7l.9-5L4.8 8.2l5-.7L12 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
];

export default function ReservationTimeline() {
  const { fetchSection } = usePageContent();
  const section = fetchSection("reservation", "timeline", {
    title: "Your Reservation Journey",
    items: RESERVATION_TIMELINE.map(({ title, description }) => ({ title, description })),
  });

  const steps = section.items.map((item, index) => ({
    ...RESERVATION_TIMELINE[index],
    title: item.title,
    description: item.description ?? RESERVATION_TIMELINE[index]?.description ?? "",
    icon: stepIcons[index],
  }));

  return (
    <motion.section
      className="reservation-timeline"
      aria-labelledby="reservation-timeline-title"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.85, ease: EASE_POWER3 }}
    >
      <h2 id="reservation-timeline-title" className="reservation-timeline__title">
        {section.title}
      </h2>

      <ol className="reservation-timeline__track">
        {steps.map((step, index) => (
          <li key={step.id} className="reservation-timeline__step">
            <div className="reservation-timeline__node">
              <span className="reservation-timeline__icon">{step.icon}</span>
              <span className="reservation-timeline__number">{index + 1}</span>
            </div>
            {index < steps.length - 1 ? (
              <span className="reservation-timeline__connector" aria-hidden />
            ) : null}
            <div className="reservation-timeline__copy">
              <h3 className="reservation-timeline__step-title">{step.title}</h3>
              <p className="reservation-timeline__step-desc">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </motion.section>
  );
}
