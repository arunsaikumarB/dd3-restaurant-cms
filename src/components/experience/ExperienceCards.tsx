import { useEffect, useRef, useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { EASE_POWER3 } from "../showcase/motion";
import { ORDER_URL, RESERVE_URL } from "../../constants/navigation";
import { SITE } from "../../constants/site";
import { usePageContent } from "../../context/PageContentContext";
import { useSectionImage } from "../../hooks/useGallerySection";
import { useLocationSelection } from "../../context/LocationContext";
import { trackOrderClick, trackReservationClick } from "../../services/analytics";
import ExperienceCard from "./ExperienceCard";
import "./experience.css";

const TICKER_ITEMS = [
  "Chef's Special Tasting Menu — Book in Advance",
  "Weekend Mandi Nights — Every Friday & Saturday",
  "Happy Hours 5 PM – 7 PM",
  "Private Dining Available for Groups",
  "Authentic Dum Biryani — Slow-Cooked Daily",
];

const EXPERIENCE_FALLBACK = {
  eyebrowTemplate: "Discover {name}",
  title: "Choose Your Experience",
  subtitle:
    "Whether you're dining in, ordering online, or exploring our menu, your next experience starts here.",
  menuCardLabel: "The Menu",
  menuCardHeadline: "{name} — a feast made with love",
  menuCardSubtitle: "Explore our full collection of biryanis, curries, tandoori and desserts.",
  menuCardCta: { label: "Explore Menu", url: "/menu" },
  orderCardLabel: "The Kitchen",
  orderCardHeadline: "In the heart of every flavour",
  orderCardSubtitle: "Fresh, bold and delivered with the same passion as our dining room.",
  reservationCardLabel: "Reservations",
  reservationCardHeadline: "Of the city, every plate",
  reservationCardSubtitleFallback: "An elegant setting for unforgettable evenings.",
  reservationCardCta: { label: "Reserve a Table", url: RESERVE_URL },
  tickerItems: TICKER_ITEMS.map((text) => ({ text })),
};

export interface ExperienceCardsProps {
  restaurantName?: string;
  hoursLabel?: string;
  phone?: string;
  email?: string;
  address?: string;
  facebook?: string;
  instagram?: string;
  youtube?: string;
  mapsUrl?: string;
  orderCtaText?: string;
  orderCtaLink?: string;
}

export default function ExperienceCards({
  restaurantName = SITE.name,
  hoursLabel = `${SITE.hours[0].days} · ${SITE.hours[0].time}`,
  phone,
  email,
  address,
  facebook,
  instagram,
  youtube,
  mapsUrl,
  orderCtaText = "Order Now",
  orderCtaLink = ORDER_URL,
}: ExperienceCardsProps) {
  const { pathname } = useLocation();
  const { selectedLocationId } = useLocationSelection();
  const { fetchSection, interpolate } = usePageContent();
  const experience = fetchSection("home", "experience", EXPERIENCE_FALLBACK);
  const menuImage = useSectionImage("choose_experience_menu", "/showcase/biryani.webp");
  const orderImage = useSectionImage("choose_experience_order", "/showcase/tandoori.webp");
  const visitImage = useSectionImage("choose_experience_visit", "/frames/frame_0060.webp");

  const cards = useMemo(() => {
    const socialMeta = [
      instagram ? "Instagram" : null,
      facebook ? "Facebook" : null,
      youtube ? "YouTube" : null,
    ]
      .filter(Boolean)
      .join(" · ");
    const reservationMeta = [hoursLabel, phone, email, socialMeta, mapsUrl ? "Google Maps" : null]
      .filter(Boolean)
      .join(" · ");

    return [
      {
        label: experience.menuCardLabel,
        headline: interpolate(experience.menuCardHeadline, { name: restaurantName }),
        subtitle: experience.menuCardSubtitle,
        image: menuImage,
        imageAlt: "Premium biryani from Desi Dhamaka",
        buttonText: experience.menuCardCta.label,
        link: experience.menuCardCta.url,
        favourites: [
          { src: "/showcase/biryani.webp", alt: "Biryani" },
          { src: "/showcase/butter-chicken.webp", alt: "Butter chicken" },
          { src: "/showcase/desserts-falooda.webp", alt: "Desserts" },
        ],
        rotation: { rotateY: -14, rotateZ: -3, translateY: 12 },
        scrollDelay: 200,
      },
      {
        title: "Order Online",
        label: experience.orderCardLabel,
        headline: experience.orderCardHeadline,
        subtitle: experience.orderCardSubtitle,
        image: orderImage,
        imageAlt: "Guests enjoying Desi Dhamaka",
        buttonText: orderCtaText,
        link: orderCtaLink,
        rotation: { rotateY: 0, rotateZ: 0, scale: 1.1, translateY: -22 },
        scrollDelay: 0,
        isCenter: true,
      },
      {
        label: experience.reservationCardLabel,
        headline: experience.reservationCardHeadline,
        subtitle: address || experience.reservationCardSubtitleFallback,
        meta: reservationMeta,
        image: visitImage,
        imageAlt: "Desi Dhamaka restaurant interior",
        buttonText: experience.reservationCardCta.label,
        link: experience.reservationCardCta.url,
        rotation: { rotateY: 14, rotateZ: 3, translateY: 12 },
        scrollDelay: 400,
      },
    ];
  }, [restaurantName, hoursLabel, phone, email, address, facebook, instagram, youtube, mapsUrl, orderCtaText, orderCtaLink, menuImage, orderImage, visitImage, experience, interpolate]);

  const sectionRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [flat, setFlat] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const updateFlat = () => setFlat(mq.matches);
    updateFlat();
    mq.addEventListener("change", updateFlat);
    return () => mq.removeEventListener("change", updateFlat);
  }, []);

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
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="experience-section"
      aria-labelledby="experience-heading"
    >
      <div className="experience-section__bg" aria-hidden />
      <div className="experience-section__glow" aria-hidden />

      <motion.div
        className="experience-section__header"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.8, ease: EASE_POWER3 }}
      >
        <p className="experience-section__eyebrow">
          {interpolate(experience.eyebrowTemplate, { name: restaurantName })}
        </p>
        <h2 id="experience-heading" className="experience-section__title">
          {experience.title}
        </h2>
        <p className="experience-section__subtitle">
          {experience.subtitle}
        </p>
      </motion.div>

      <div className={`experience-stage-wrap ${flat ? "experience-stage-wrap--flat" : ""}`}>
        <div
          className="experience-stage"
          style={flat ? undefined : { perspective: "1800px" }}
        >
          <div className={`experience-stage__inner ${flat ? "experience-stage__inner--flat" : ""}`}>
            {cards.map((card) => (
              <ExperienceCard
                key={card.title ?? card.headline}
                label={card.label}
                title={card.title ?? card.headline ?? ""}
                headline={card.headline}
                subtitle={card.subtitle}
                meta={card.meta}
                image={card.image}
                buttonText={card.buttonText}
                link={card.link}
                favourites={card.favourites}
                rotation={card.rotation}
                isCenter={card.isCenter}
                scrollDelay={card.scrollDelay}
                visible={visible}
                flat={flat}
                onActivate={() => {
                  if (card.isCenter) {
                    trackOrderClick(pathname, selectedLocationId);
                    return;
                  }
                  if (card.link === RESERVE_URL) {
                    trackReservationClick(pathname, selectedLocationId);
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="experience-ticker" aria-hidden>
        <div className="experience-ticker__track">
          {[...experience.tickerItems, ...experience.tickerItems].map((item, i) => (
            <span key={i} className="experience-ticker__item">
              {item.text}
              <span className="experience-ticker__dot">◆</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
