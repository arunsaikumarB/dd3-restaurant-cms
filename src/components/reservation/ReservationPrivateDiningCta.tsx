import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { usePageContent } from "../../context/PageContentContext";
import { useLocationSelection } from "../../context/LocationContext";
import { locPath } from "../../utils/locationPaths";
import { EASE_POWER3, viewportOnce } from "../showcase/motion";

export default function ReservationPrivateDiningCta() {
  const { fetchSection } = usePageContent();
  const { selectedLocationId } = useLocationSelection();
  const section = fetchSection("reservation", "private_dining_cta", {
    headline: "Celebrate Every Occasion",
    subheading: "Birthdays · Anniversaries · Corporate Events · Family Gatherings",
    ctaLabel: "Book Private Dining",
  });

  return (
    <motion.section
      className="reservation-private-cta"
      aria-labelledby="private-dining-cta-title"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.9, ease: EASE_POWER3 }}
    >
      <div className="reservation-private-cta__texture" aria-hidden />
      <div className="reservation-private-cta__inner">
        <p className="reservation-private-cta__eyebrow">Private Dining</p>
        <h2 id="private-dining-cta-title" className="reservation-private-cta__headline">
          {section.headline}
        </h2>
        <p className="reservation-private-cta__subheading">{section.subheading}</p>
        <Link
          to={locPath(selectedLocationId, "/parties")}
          className="reservation-private-cta__btn"
        >
          {section.ctaLabel}
        </Link>
      </div>
    </motion.section>
  );
}
