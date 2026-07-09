import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import SignatureCard from "./SignatureCard";
import NavigationArrows from "./NavigationArrows";
import FeatureRow from "./FeatureRow";
import { useLocationSelection } from "../../context/LocationContext";
import { usePageContent } from "../../context/PageContentContext";
import { useHomepageData } from "../../hooks/useHomepageData";
import { useMenuOrderAction } from "../../hooks/useMenuOrderAction";
import { resolveOrderUrl } from "../../utils/locationLinks";
import { SIGNATURE_DISHES, SIGNATURE_FEATURES } from "../../data/signatureDishes";
import type { SignatureDish } from "../../data/signatureDishes";
import "./signature.css";

const CARD_WIDTH = 280;
const CARD_GAP = 12;
const SCROLL_STEP = (CARD_WIDTH + CARD_GAP) * 2;

const SIGNATURE_FALLBACK = {
  eyebrow: "Desi Dhamaka Signatures",
  title: "Signature Special Dishes",
  subtitle:
    "Discover our chef's most celebrated creations, prepared with authentic Indian flavours, premium ingredients, and unforgettable presentation.",
  viewMenuCta: { label: "View Live Menu", url: "/menu" },
  dishes: SIGNATURE_DISHES.map(({ name, category, price, image, badge, category_name, item_name }) => ({
    image,
    name,
    category,
    price: String(price),
    badge: badge ?? "",
    category_name,
    item_name,
  })),
  features: SIGNATURE_FEATURES.map(({ title, description }) => ({ title, description })),
};

function toSignatureDishes(
  items: (typeof SIGNATURE_FALLBACK)["dishes"],
): SignatureDish[] {
  return items.map((item, index) => ({
    id: `${item.name}-${index}`,
    name: item.name,
    category: item.category,
    category_name: item.category_name || "",
    item_name: item.item_name || "",
    price: Number.parseFloat(item.price) || 0,
    image: item.image,
    badge: item.badge || undefined,
  }));
}

export default function SignatureCarousel() {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [sectionVisible, setSectionVisible] = useState(false);

  const { selectedLocationId } = useLocationSelection();
  const { menuHref, goToLiveMenu } = useMenuOrderAction();
  const { fetchSection } = usePageContent();
  const signature = fetchSection("home", "signature", SIGNATURE_FALLBACK);
  const { bundle, locationId: bundleLocationId } = useHomepageData();
  const dishes = useMemo(() => toSignatureDishes(signature.dishes), [signature.dishes]);
  const orderBaseUrl = useMemo(
    () =>
      resolveOrderUrl(bundle.settings, selectedLocationId, bundleLocationId),
    [bundle.settings, selectedLocationId, bundleLocationId],
  );

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const reveal = () => setSectionVisible(true);

    if (typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal();
          observer.disconnect();
        }
      },
      { threshold: 0.08 },
    );
    observer.observe(el);

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      reveal();
      observer.disconnect();
    }

    return () => observer.disconnect();
  }, [dishes.length]);

  const scrollPrev = useCallback(() => {
    viewportRef.current?.scrollBy({ left: -SCROLL_STEP, behavior: "smooth" });
  }, []);

  const scrollNext = useCallback(() => {
    viewportRef.current?.scrollBy({ left: SCROLL_STEP, behavior: "smooth" });
  }, []);

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
          {signature.eyebrow}
        </motion.p>
        <motion.h2
          id="signature-heading"
          className="signature-section__title"
          initial={{ opacity: 0, y: 24 }}
          animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.75, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          {signature.title}
        </motion.h2>
        <motion.p
          className="signature-section__subtitle"
          initial={{ opacity: 0, y: 24 }}
          animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.75, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {signature.subtitle}
        </motion.p>
      </header>

      <div className="signature-carousel w-full relative overflow-hidden">
        <NavigationArrows
          onPrev={scrollPrev}
          onNext={scrollNext}
          canScrollPrev
          canScrollNext
        />

        <div
          ref={viewportRef}
          className="signature-carousel__viewport"
          role="region"
          aria-label="Signature dishes carousel"
        >
          <div className="signature-carousel__track">
            {dishes.map((dish, index) => (
              <div className="signature-carousel__slide" key={dish.id}>
                <SignatureCard
                  dish={dish}
                  orderBaseUrl={orderBaseUrl}
                  entranceVisible={sectionVisible}
                  entranceDelay={index * 0.08}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="signature-section__cta-wrap">
        <span className="signature-section__cta-line" aria-hidden />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={sectionVisible ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <a
            href={menuHref}
            onClick={goToLiveMenu}
            className="inline-flex items-center justify-center rounded-md border border-saffron/70 bg-transparent px-8 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-saffron transition-all duration-[450ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-saffron hover:bg-saffron/10 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0a09]"
          >
            {signature.viewMenuCta.label}
          </a>
        </motion.div>
        <span className="signature-section__cta-line" aria-hidden />
      </div>

      <FeatureRow visible={sectionVisible} features={signature.features} />
    </section>
  );
}
