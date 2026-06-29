import { motion } from "framer-motion";
import { EASE_POWER3 } from "../showcase/motion";

export default function OrderHero() {
  return (
    <section className="order-hero" aria-labelledby="order-hero-title">
      <div className="order-page__texture" aria-hidden />
      <div className="order-hero__inner">
        <motion.p
          className="order-hero__eyebrow"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_POWER3 }}
        >
          Online Ordering
        </motion.p>

        <motion.h1
          id="order-hero-title"
          className="order-hero__title"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.08, ease: EASE_POWER3 }}
        >
          Fresh Indian Food, Delivered to Your Door
        </motion.h1>

        <motion.p
          className="order-hero__subtitle"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.16, ease: EASE_POWER3 }}
        >
          Order authentic Indian food online from Desi Dhamaka Oak Tree, NJ. Choose
          Pickup or Delivery from 540 Lawrence Square Blvd S, Lawrence Township, NJ.
        </motion.p>
      </div>
    </section>
  );
}
