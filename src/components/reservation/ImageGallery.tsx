import { motion } from "framer-motion";
import { RESERVATION_GALLERY } from "../../data/reservationPage";
import { usePageContent } from "../../context/PageContentContext";
import SectionHeading from "../ui/SectionHeading";
import { EASE_POWER3, viewportOnce } from "../showcase/motion";

export default function ImageGallery() {
  const { fetchSection } = usePageContent();
  const section = fetchSection("reservation", "gallery", {
    eyebrow: "Our Spaces",
    title: "A Glimpse Inside",
    subtitle: "Reception, dining halls, private rooms, and the artistry of our kitchen.",
    items: RESERVATION_GALLERY.map(({ label }) => ({ label })),
  });

  const galleryItems = section.items.map((item, index) => {
    const fallback = RESERVATION_GALLERY[index];
    return {
      id: fallback?.id ?? `gallery-${index}`,
      label: item.label,
      image: fallback?.image ?? "/frames/frame_0025.webp",
      alt: fallback?.alt ?? item.label,
    };
  });

  return (
    <section className="reservation-gallery" aria-labelledby="gallery-title">
      <div className="reservation-gallery__inner">
        <SectionHeading
          eyebrow={section.eyebrow}
          title={section.title}
          subtitle={section.subtitle}
          align="center"
        />
        <h2 id="gallery-title" className="sr-only">
          Restaurant gallery
        </h2>

        <div className="reservation-gallery__strip">
          {galleryItems.map((item, index) => (
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
