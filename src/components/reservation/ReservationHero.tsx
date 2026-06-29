import { useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { RESERVATION_BANNER } from "../../data/reservationPage";
import { EASE_POWER3 } from "../showcase/motion";

export default function ReservationHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const bannerY = useTransform(scrollYProgress, [0, 1], [0, 40]);

  const scrollToBooking = () => {
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={sectionRef}
      className="reservation-hero reservation-hero--banner"
      aria-label="Reserve your table at Desi Dhamaka"
    >
      <motion.button
        type="button"
        className="reservation-hero__banner-link"
        onClick={scrollToBooking}
        initial={{ opacity: 0, y: 12 }}
        animate={loaded ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9, ease: EASE_POWER3 }}
        aria-label="Scroll to book your table"
      >
        <motion.img
          className="reservation-hero__banner"
          src={RESERVATION_BANNER}
          alt="Desi Dhamaka — Authentic flavors, memorable experiences. Book your table and enjoy the finest Indian cuisine."
          style={{ y: bannerY }}
          onLoad={() => setLoaded(true)}
          decoding="async"
          fetchPriority="high"
        />
      </motion.button>

      <motion.button
        type="button"
        className="reservation-hero__scroll"
        onClick={scrollToBooking}
        initial={{ opacity: 0 }}
        animate={loaded ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.5, ease: EASE_POWER3 }}
        aria-label="Scroll to booking"
      >
        <span className="reservation-hero__scroll-dot" />
        Scroll
      </motion.button>
    </section>
  );
}
