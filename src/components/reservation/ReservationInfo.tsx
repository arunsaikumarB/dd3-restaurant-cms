import { motion } from "framer-motion";
import { RESERVATION_STATS } from "../../data/reservationPage";
import { EASE_POWER3, viewportOnce } from "../showcase/motion";
import InteriorSlideshow from "./InteriorSlideshow";

export default function ReservationInfo() {
  return (
    <motion.div
      className="reservation-info"
      initial={{ opacity: 0, x: -24 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.9, ease: EASE_POWER3 }}
    >
      <InteriorSlideshow />
      <div className="reservation-info__gradient" aria-hidden />

      <div className="reservation-info__cards">
        {RESERVATION_STATS.map((stat, index) => (
          <motion.div
            key={stat.id}
            className="reservation-info__card"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{
              duration: 0.7,
              ease: EASE_POWER3,
              delay: 0.1 + index * 0.08,
            }}
          >
            <p
              className={
                "reservation-info__card-value" +
                ("accent" in stat && stat.accent
                  ? " reservation-info__card-value--accent"
                  : "")
              }
            >
              {stat.value}
            </p>
            <p className="reservation-info__card-label">{stat.label}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
