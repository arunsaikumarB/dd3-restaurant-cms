import { useMemo } from "react";
import { Link } from "react-router-dom";
import OffersGrid from "./OffersGrid";
import { OffersPageSkeleton } from "./OffersPageSkeleton";
import SectionHeading from "../ui/SectionHeading";
import { usePageContent } from "../../context/PageContentContext";
import { useLocationSelection } from "../../context/LocationContext";
import { useOffersData } from "../../hooks/useOffersData";
import { locPath } from "../../utils/locationPaths";
import "./offers-page.css";

const HOME_OFFERS_LIMIT = 4;

const OFFERS_TEASER_FALLBACK = {
  eyebrow: "Exclusive Promotions",
  title: "Current Offers & Specials",
  subtitle:
    "Seasonal specials, lunch deals and limited-time promotions available right now.",
  viewAllCta: { label: "View All Offers", url: "/special-offers" },
};

export default function HomeOffersSection() {
  const { fetchSection } = usePageContent();
  const { selectedLocationId } = useLocationSelection();
  const teaser = fetchSection("home", "offers_teaser", OFFERS_TEASER_FALLBACK);
  const { offers, loading } = useOffersData(selectedLocationId);

  const featuredOffers = useMemo(
    () => offers.slice(0, HOME_OFFERS_LIMIT),
    [offers],
  );

  const viewAllPath = locPath(selectedLocationId, teaser.viewAllCta.url);

  if (!loading && featuredOffers.length === 0) {
    return null;
  }

  return (
    <section
      className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 lg:px-16"
      aria-label={teaser.title}
    >
      <SectionHeading
        eyebrow={teaser.eyebrow}
        title={teaser.title}
        subtitle={teaser.subtitle}
        align="center"
      />

      <div className="mt-14">
        {loading ? (
          <OffersPageSkeleton />
        ) : (
          <OffersGrid offers={featuredOffers} locationId={selectedLocationId ?? undefined} />
        )}
      </div>

      <div className="mt-12 flex justify-center">
        <Link
          to={viewAllPath}
          className="inline-flex items-center justify-center rounded-full border border-cocoa/20 bg-transparent px-8 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-cocoa transition-all duration-300 hover:border-saffron hover:bg-saffron/10 hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2"
        >
          {teaser.viewAllCta.label}
        </Link>
      </div>
    </section>
  );
}
