import { motion } from "framer-motion";
import { SITE } from "../../constants/site";
import SectionHeading from "../ui/SectionHeading";
import { EASE_POWER3, viewportOnce } from "../showcase/motion";

export default function GoogleMap() {
  return (
    <section className="reservation-map" aria-labelledby="map-title">
      <div className="reservation-map__inner">
        <SectionHeading
          eyebrow="Find Us"
          title="Visit Desi Dhamaka"
          subtitle={SITE.address}
          align="center"
        />
        <h2 id="map-title" className="sr-only">
          Google Map
        </h2>

        <motion.div
          className="reservation-map__frame"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewportOnce}
          transition={{ duration: 0.9, ease: EASE_POWER3 }}
        >
          <iframe
            title="Desi Dhamaka location on Google Maps"
            src={SITE.mapEmbed}
            className="reservation-map__iframe"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </motion.div>
      </div>
    </section>
  );
}
