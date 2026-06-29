import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { EXPERIENCE_GALLERY } from "../../data/atmosphereGallery";
import { EASE_POWER3 } from "../showcase/motion";
import ExperienceCard from "./ExperienceCard";
import FeatureRow from "./FeatureRow";
import AnnouncementRibbon from "./AnnouncementRibbon";
import "./atmosphere.css";

export interface ExperienceSectionProps {
  restaurantName?: string;
}

export default function ExperienceSection({
  restaurantName = "Desi Dhamaka",
}: ExperienceSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
  });

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!emblaApi) return;

    const onPointerDown = () => setIsDragging(true);
    const onPointerUp = () => setIsDragging(false);

    emblaApi.on("pointerDown", onPointerDown);
    emblaApi.on("pointerUp", onPointerUp);

    return () => {
      emblaApi.off("pointerDown", onPointerDown);
      emblaApi.off("pointerUp", onPointerUp);
    };
  }, [emblaApi]);

  const renderCard = useCallback(
    (item: (typeof EXPERIENCE_GALLERY)[number], index: number) => (
      <ExperienceCard
        key={item.id}
        title={item.title}
        subtitle={item.subtitle}
        image={item.image}
        imageAlt={item.imageAlt}
        index={index}
        visible={visible}
      />
    ),
    [visible],
  );

  return (
    <section ref={sectionRef} className="exp-section" aria-labelledby="exp-section-heading">
      <div className="exp-section__texture" aria-hidden />

      <div className="exp-section__inner">
        <motion.header
          className="exp-section__header"
          initial={{ opacity: 0, y: 40 }}
          animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.9, ease: EASE_POWER3 }}
        >
          <div className="exp-section__eyebrow-row">
            <span className="exp-section__diamond" aria-hidden />
            <p className="exp-section__eyebrow">{restaurantName} Experience</p>
            <span className="exp-section__diamond" aria-hidden />
          </div>
          <h2 id="exp-section-heading" className="exp-section__title">
            Experience the Ambience
          </h2>
          <p className="exp-section__subtitle">
            Every corner of {restaurantName} is designed to bring together authentic Indian
            hospitality, warm interiors, and unforgettable dining moments.
          </p>
        </motion.header>

        {/* Desktop — 5 equal squares, always fits container width */}
        <div className="exp-section__row" role="list">
          {EXPERIENCE_GALLERY.map((item, index) => (
            <div className="exp-section__slot" role="listitem" key={item.id}>
              {renderCard(item, index)}
            </div>
          ))}
        </div>

        {/* Tablet + mobile — contained horizontal swipe (no page scroll) */}
        <div className="exp-section__scroller">
          <div
            className={`exp-section__viewport${isDragging ? " is-dragging" : ""}`}
            ref={emblaRef}
          >
            <div className="exp-section__track">
              {EXPERIENCE_GALLERY.map((item, index) => (
                <div className="exp-section__slide" key={item.id}>
                  {renderCard(item, index)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <FeatureRow visible={visible} />
      <AnnouncementRibbon />
    </section>
  );
}
