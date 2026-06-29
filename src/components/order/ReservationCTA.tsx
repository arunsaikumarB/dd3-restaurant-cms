import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { RESERVE_URL } from "../../constants/navigation";
import { EASE_POWER3, viewportOnce } from "../showcase/motion";

export default function ReservationCTA() {
  return (
    <section className="order-reserve" aria-labelledby="order-reserve-title">
      <motion.div
        className="order-reserve__banner"
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={viewportOnce}
        transition={{ duration: 0.9, ease: EASE_POWER3 }}
      >
        <div className="order-reserve__content">
          <p className="order-reserve__eyebrow">Need a Table Instead?</p>
          <h2 id="order-reserve-title" className="order-reserve__title">
            Reserve Your Dining Experience
          </h2>
          <Link to={RESERVE_URL} className="order-reserve__btn">
            Reserve a Table
            <span className="order-reserve__btn-arrow" aria-hidden>
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
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
