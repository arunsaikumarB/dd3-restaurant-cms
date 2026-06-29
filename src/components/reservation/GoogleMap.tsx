import { motion } from "framer-motion";
import { useHomepageData } from "../../hooks/useHomepageData";
import SectionHeading from "../ui/SectionHeading";
import { EASE_POWER3, viewportOnce } from "../showcase/motion";

export default function GoogleMap() {
  const { bundle } = useHomepageData();
  const { settings } = bundle;

  return (
    <section className="reservation-map" aria-labelledby="map-title">
      <div className="reservation-map__inner">
        <SectionHeading
          eyebrow="Find Us"
          title="Visit Desi Dhamaka"
          subtitle={settings.address}
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
            src={settings.google_maps}
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
