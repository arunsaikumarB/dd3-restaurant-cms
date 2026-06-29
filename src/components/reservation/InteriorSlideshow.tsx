import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { RESERVATION_INTERIOR_SLIDES } from "../../data/reservationPage";
import { EASE_POWER3, prefersReducedMotion } from "../showcase/motion";

const SLIDE_INTERVAL_MS = 5000;

export default function InteriorSlideshow() {
  const [index, setIndex] = useState(0);
  const reducedMotion = prefersReducedMotion();
  const slides = RESERVATION_INTERIOR_SLIDES;
  const active = slides[index];

  useEffect(() => {
    if (reducedMotion || slides.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, SLIDE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [reducedMotion, slides.length]);

  return (
    <div className="reservation-info__slideshow">
      <AnimatePresence mode="sync">
        <motion.img
          key={active.id}
          className="reservation-info__slide"
          src={active.image}
          alt={active.alt}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1.08 }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 1.1, ease: EASE_POWER3 },
            scale: { duration: SLIDE_INTERVAL_MS / 1000, ease: "linear" },
          }}
          decoding="async"
        />
      </AnimatePresence>

      {slides.length > 1 && (
        <div
          className="reservation-info__dots"
          role="tablist"
          aria-label="Interior photos"
        >
          {slides.map((slide, i) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show photo ${i + 1} of ${slides.length}`}
              onClick={() => setIndex(i)}
              className={
                "reservation-info__dot" +
                (i === index ? " reservation-info__dot--active" : "")
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
