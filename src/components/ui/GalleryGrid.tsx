import { motion } from "framer-motion";
import { EASE_POWER3 } from "../showcase/motion";

interface GalleryGridProps {
  images: { src: string; alt: string }[];
  columns?: 2 | 3;
}

export default function GalleryGrid({ images, columns = 3 }: GalleryGridProps) {
  const gridClass =
    columns === 3
      ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      : "grid grid-cols-1 gap-4 sm:grid-cols-2";

  return (
    <div className={gridClass}>
      {images.map((img, i) => (
        <motion.div
          key={img.src}
          className="group overflow-hidden rounded-[24px] shadow-[0_16px_48px_-16px_rgba(43,29,24,0.22)]"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.15 }}
          transition={{ duration: 0.7, ease: EASE_POWER3, delay: i * 0.07 }}
        >
          <div className="relative overflow-hidden">
            <img
              src={img.src}
              alt={img.alt}
              loading="lazy"
              decoding="async"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 420px"
              className="aspect-[4/3] w-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
            />
            <div className="absolute inset-0 bg-cocoa/0 transition-all duration-[400ms] group-hover:bg-cocoa/15" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
