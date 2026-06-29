import { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { EASE_POWER3 } from "../showcase/motion";
import { ORDER_URL, RESERVE_URL } from "../../constants/navigation";
import { SITE } from "../../constants/site";
import ExperienceCard from "./ExperienceCard";
import "./experience.css";

const TICKER_ITEMS = [
  "Chef's Special Tasting Menu — Book in Advance",
  "Weekend Mandi Nights — Every Friday & Saturday",
  "Happy Hours 5 PM – 7 PM",
  "Private Dining Available for Groups",
  "Authentic Dum Biryani — Slow-Cooked Daily",
];

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
        label: "The Menu",
        headline: `${restaurantName} — a feast made with love`,
        subtitle: "Explore our full collection of biryanis, curries, tandoori and desserts.",
        image: "/showcase/biryani.jpg",
        imageAlt: "Premium biryani from Desi Dhamaka",
        buttonText: "Explore Menu",
        link: "/menu",
        favourites: [
          { src: "/showcase/biryani.jpg", alt: "Biryani" },
          { src: "/showcase/butter-chicken.jpg", alt: "Butter chicken" },
          { src: "/showcase/desserts-falooda.jpg", alt: "Desserts" },
        ],
        rotation: { rotateY: -14, rotateZ: -3, translateY: 12 },
        scrollDelay: 200,
      },
      {
        title: "Order Online",
        label: "The Kitchen",
        headline: "In the heart of every flavour",
        subtitle: "Fresh, bold and delivered with the same passion as our dining room.",
        image: "/showcase/tandoori.jpg",
        imageAlt: "Guests enjoying Desi Dhamaka",
        buttonText: orderCtaText,
        link: orderCtaLink,
        rotation: { rotateY: 0, rotateZ: 0, scale: 1.1, translateY: -36 },
        scrollDelay: 0,
        isCenter: true,
      },
      {
        label: "Reservations",
        headline: "Of the city, every plate",
        subtitle: address || "An elegant setting for unforgettable evenings.",
        meta: reservationMeta,
        image: "/frames/frame_0060.jpg",
        imageAlt: "Desi Dhamaka restaurant interior",
        buttonText: "Reserve a Table",
        link: RESERVE_URL,
        rotation: { rotateY: 14, rotateZ: 3, translateY: 12 },
        scrollDelay: 400,
      },
    ];
  }, [restaurantName, hoursLabel, phone, email, address, facebook, instagram, youtube, mapsUrl, orderCtaText, orderCtaLink]);

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
        <p className="experience-section__eyebrow">Discover {restaurantName}</p>
        <h2 id="experience-heading" className="experience-section__title">
          Choose Your Experience
        </h2>
        <p className="experience-section__subtitle">
          Whether you&apos;re dining in, ordering online, or exploring our menu,
          your next experience starts here.
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
              />
            ))}
          </div>
        </div>
      </div>

      <div className="experience-ticker" aria-hidden>
        <div className="experience-ticker__track">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="experience-ticker__item">
              {item}
              <span className="experience-ticker__dot">◆</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
