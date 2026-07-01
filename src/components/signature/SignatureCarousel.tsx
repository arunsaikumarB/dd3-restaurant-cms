import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { WheelGesturesPlugin } from "embla-carousel-wheel-gestures";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SignatureCard from "./SignatureCard";
import NavigationArrows from "./NavigationArrows";
import FeatureRow from "./FeatureRow";
import { useLocationSelection } from "../../context/LocationContext";
import { useHomepageData } from "../../hooks/useHomepageData";
import { useSignatureDishes } from "../../hooks/useSignatureDishes";
import { resolveOrderUrl } from "../../utils/locationLinks";
import "./signature.css";

const AUTOPLAY_MS = 4500;

export default function SignatureCarousel() {
  const sectionRef = useRef<HTMLElement>(null);
  const [sectionVisible, setSectionVisible] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const { selectedLocationId } = useLocationSelection();
  const { bundle, locationId: bundleLocationId } = useHomepageData();
  const { dishes, locationId: dishLocationId } = useSignatureDishes(
    selectedLocationId,
  );
  const orderBaseUrl = resolveOrderUrl(
    bundle.settings,
    selectedLocationId,
    bundleLocationId,
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "center",
      loop: true,
      skipSnaps: false,
      duration: 35,
    },
    [WheelGesturesPlugin({ forceWheelAxis: "x" })],
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;

    const onPointerDown = () => setIsDragging(true);
    const onPointerUp = () => setIsDragging(false);

    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    emblaApi.on("pointerDown", onPointerDown);
    emblaApi.on("pointerUp", onPointerUp);
    onSelect();

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
      emblaApi.off("pointerDown", onPointerDown);
      emblaApi.off("pointerUp", onPointerUp);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || dishes.length === 0) return;
    emblaApi.reInit();
    const start = Math.floor(dishes.length / 2);
    emblaApi.scrollTo(start, true);
    setSelectedIndex(start);
  }, [emblaApi, dishes, dishLocationId]);

  useEffect(() => {
    if (!emblaApi || isPaused || dishes.length < 2) return;
    const timer = window.setInterval(() => emblaApi.scrollNext(), AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [emblaApi, isPaused, dishes.length]);

  useEffect(() => {
    if (!dishes.length) return;
    const len = dishes.length;
    const indices = [
      (selectedIndex - 1 + len) % len,
      selectedIndex,
      (selectedIndex + 1) % len,
    ];
    for (const index of indices) {
      const src = dishes[index]?.image;
      if (!src) continue;
      const img = new Image();
      img.src = src;
    }
  }, [selectedIndex, dishes]);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSectionVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const handleCardHover = useCallback(
    (index: number) => {
      setHoveredIndex(index);
      emblaApi?.scrollTo(index);
    },
    [emblaApi],
  );

  const handleCardLeave = useCallback(() => {
    setHoveredIndex(null);
  }, []);

  const getDistance = useCallback(
    (index: number) => {
      const len = dishes.length;
      if (len === 0) return 0;
      let diff = Math.abs(index - selectedIndex);
      if (diff > len / 2) diff = len - diff;
      return diff;
    },
    [dishes.length, selectedIndex],
  );

  return (
    <section
      ref={sectionRef}
      className="signature-section"
      aria-labelledby="signature-heading"
    >
      <div className="signature-section__bg" aria-hidden />
      <div className="signature-section__texture" aria-hidden />
      <div className="signature-section__vignette" aria-hidden />

      <header className="signature-section__header">
        <motion.span
          className="signature-section__diamond"
          aria-hidden
          initial={{ opacity: 0, scale: 0 }}
          animate={sectionVisible ? { opacity: 0.85, scale: 1 } : {}}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
        <motion.p
          className="signature-section__eyebrow"
          initial={{ opacity: 0, y: 20 }}
          animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          Desi Dhamaka Signatures
        </motion.p>
        <motion.h2
          id="signature-heading"
          className="signature-section__title"
          initial={{ opacity: 0, y: 24 }}
          animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          Signature Special Dishes
        </motion.h2>
        <motion.p
          className="signature-section__subtitle"
          initial={{ opacity: 0, y: 24 }}
          animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          Discover our chef&apos;s most celebrated creations, prepared with authentic Indian
          flavours, premium ingredients, and unforgettable presentation.
        </motion.p>
      </header>

      <div
        className="signature-carousel mx-auto max-w-[1400px] px-4 md:px-8 lg:px-12"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className={`signature-carousel__viewport${isDragging ? " is-dragging" : ""}`}
          ref={emblaRef}
          role="region"
          aria-label="Signature dishes carousel"
        >
          <div className="signature-carousel__container">
            {dishes.map((dish, index) => (
              <div className="signature-carousel__slide" key={dish.id}>
                <SignatureCard
                  dish={dish}
                  orderBaseUrl={orderBaseUrl}
                  isActive={selectedIndex === index}
                  isHovered={hoveredIndex === index}
                  distance={getDistance(index)}
                  onHover={() => handleCardHover(index)}
                  onLeave={handleCardLeave}
                  entranceVisible={sectionVisible}
                  entranceDelay={index * 0.1}
                />
              </div>
            ))}
          </div>
        </div>

        <NavigationArrows
          onPrev={scrollPrev}
          onNext={scrollNext}
          canScrollPrev={Boolean(emblaApi)}
          canScrollNext={Boolean(emblaApi)}
        />
      </div>

      <div className="signature-section__cta-wrap">
        <span className="signature-section__cta-line" aria-hidden />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            to="/menu"
            className="inline-flex items-center justify-center rounded-md border border-saffron/70 bg-transparent px-8 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-saffron transition-all duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-saffron hover:bg-saffron/10 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0a09]"
          >
            View Full Menu
          </Link>
        </motion.div>
        <span className="signature-section__cta-line" aria-hidden />
      </div>

      <FeatureRow visible={sectionVisible} />
    </section>
  );
}
