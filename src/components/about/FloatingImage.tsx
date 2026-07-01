import { motion } from "framer-motion";
import { ABOUT_FLOATING_IMAGE, ABOUT_MAIN_IMAGE } from "../../data/aboutSection";
import { useGallerySection } from "../../hooks/useGallerySection";
import { EASE_POWER3, viewportOnce } from "../showcase/motion";

export default function FloatingImage() {
  const foodImages = useGallerySection("home_about_food");
  const interiorImages = useGallerySection("home_about_interior");
  const mainSrc = foodImages[0]?.image ?? ABOUT_MAIN_IMAGE.src;
  const mainAlt = foodImages[0]?.alt_text || ABOUT_MAIN_IMAGE.alt;
  const floatSrc = interiorImages[0]?.image ?? ABOUT_FLOATING_IMAGE.src;
  const floatAlt = interiorImages[0]?.alt_text || ABOUT_FLOATING_IMAGE.alt;

  return (
    <div className="about-images">
      <motion.div
        className="about-images__main-wrap"
        initial={{ opacity: 0, scale: 1.08 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={viewportOnce}
        transition={{ duration: 1.1, ease: EASE_POWER3 }}
      >
        <div className="about-images__main-frame">
          <img
            className="about-images__main"
            src={mainSrc}
            alt={mainAlt}
            loading="lazy"
            decoding="async"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 560px"
          />
        </div>
      </motion.div>

      <motion.div
        className="about-images__float-wrap"
        initial={{ opacity: 0, y: 48, rotate: -4 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={viewportOnce}
        transition={{ duration: 1, ease: EASE_POWER3, delay: 0.18 }}
      >
        <div className="about-images__float-frame">
          <img
            className="about-images__float"
            src={floatSrc}
            alt={floatAlt}
            loading="lazy"
            decoding="async"
            sizes="(max-width: 768px) 60vw, 240px"
          />
        </div>
      </motion.div>

      <div className="about-images__accent" aria-hidden />
    </div>
  );
}
