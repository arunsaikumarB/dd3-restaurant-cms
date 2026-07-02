import { useEffect, useState } from "react";
import OffersGrid from "../components/offers/OffersGrid";
import OffersLocationPicker from "../components/offers/OffersLocationPicker";
import { OffersPageSkeleton } from "../components/offers/OffersPageSkeleton";
import { usePageContent } from "../context/PageContentContext";
import { useLocationSelection } from "../context/LocationContext";
import { getLocationConfig, type LocationId } from "../config/locations";
import { useOffersData } from "../hooks/useOffersData";
import { useSectionImage } from "../hooks/useGallerySection";
import { trackOfferView } from "../services/analytics";
import "../components/offers/offers-page.css";

export default function OffersPage() {
  const { fetchSection } = usePageContent();
  const { selectedLocationId, setLocation } = useLocationSelection();
  const [pageLocationId, setPageLocationId] = useState<LocationId | null>(selectedLocationId);
  const { offers, loading: offersLoading } = useOffersData(pageLocationId);
  const [transitioning, setTransitioning] = useState(false);

  const hero = fetchSection("offers", "hero", {
    eyebrow: "Exclusive Promotions",
    title: "Exclusive Offers",
    subtitle:
      "Discover our latest promotions, seasonal specials, lunch deals, buffet offers, and limited-time experiences across all Desi Dhamaka locations.",
  });

  useEffect(() => {
    if (selectedLocationId && !pageLocationId) {
      setPageLocationId(selectedLocationId);
    }
  }, [pageLocationId, selectedLocationId]);

  useEffect(() => {
    if (selectedLocationId) {
      setPageLocationId(selectedLocationId);
    }
  }, [selectedLocationId]);

  const handleSelectLocation = (id: LocationId) => {
    setPageLocationId(id);
    setLocation(id);
    setTransitioning(true);
    window.setTimeout(() => setTransitioning(false), 280);
  };

  const activeLocation = pageLocationId ? getLocationConfig(pageLocationId) : null;
  const offersHeroImage = useSectionImage("offers_hero", "/showcase/tandoori.webp");
  const loading = offersLoading || transitioning;

  useEffect(() => {
    if (!pageLocationId || offers.length === 0) return;
    for (const offer of offers) {
      trackOfferView(offer.id, offer.title, pageLocationId);
    }
  }, [offers, pageLocationId]);

  return (
    <div className="bg-ivory">
      <section className="offers-hero" aria-labelledby="offers-hero-title">
        <div className="offers-hero__media" aria-hidden>
          <img
            src={offersHeroImage}
            alt=""
            className="offers-hero__image"
            loading="eager"
            decoding="async"
          />
          <div className="offers-hero__overlay" />
        </div>
        <div className="offers-hero__inner">
          <p className="offers-hero__eyebrow">{hero.eyebrow}</p>
          <h1 id="offers-hero-title" className="offers-hero__title">
            {hero.title}
          </h1>
          <p className="offers-hero__subtitle">{hero.subtitle}</p>
        </div>
      </section>

      <div className="offers-page__content">
        <OffersLocationPicker
          selectedId={pageLocationId}
          onSelect={handleSelectLocation}
        />

        {loading ? (
          <OffersPageSkeleton />
        ) : (
          <OffersGrid
            offers={offers}
            locationId={pageLocationId ?? undefined}
            locationName={activeLocation?.name}
          />
        )}
      </div>
    </div>
  );
}
