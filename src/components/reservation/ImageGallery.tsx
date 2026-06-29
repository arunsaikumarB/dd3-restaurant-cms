import { motion } from "framer-motion";
import { RESERVATION_GALLERY } from "../../data/reservationPage";
import SectionHeading from "../ui/SectionHeading";
import { EASE_POWER3, viewportOnce } from "../showcase/motion";

export default function ImageGallery() {
  return (
    <section className="reservation-gallery" aria-labelledby="gallery-title">
      <div className="reservation-gallery__inner">
        <SectionHeading
          eyebrow="Our Spaces"
          title="A Glimpse Inside"
          subtitle="Reception, dining halls, private rooms, and the artistry of our kitchen."
          align="center"
        />
        <h2 id="gallery-title" className="sr-only">
          Restaurant gallery
        </h2>

        <div className="reservation-gallery__strip">
          {RESERVATION_GALLERY.map((item, index) => (
            <motion.div
              key={item.id}
              className="reservation-gallery__item"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{
                duration: 0.8,
                ease: EASE_POWER3,
                delay: index * 0.08,
              }}
            >
              <div className="reservation-gallery__frame">
                <img
                  className="reservation-gallery__image"
                  src={item.image}
                  alt={item.alt}
                  loading="lazy"
                  decoding="async"
                />
                <span className="reservation-gallery__label">{item.label}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
