import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { type OrderOption } from "../data/orderPage";
import PageHero from "../components/ui/PageHero";
import OrderOptionCard from "../components/order/OrderOptionCard";
import FeatureGrid from "../components/order/FeatureGrid";
import SectionPlaceholder from "../components/ui/SectionPlaceholder";
import { LOCATION_OPTIONS, type LocationId } from "../config/locations";
import { buildLocationOrderMenuUrl } from "../constants/ordering";
import { useLocationSelection } from "../context/LocationContext";
import { useHomepageData } from "../hooks/useHomepageData";
import { resolveOrderUrl } from "../utils/locationLinks";
import "../components/order/order.css";

const ReservationCTA = lazy(() => import("../components/order/ReservationCTA"));

function parseLocationId(value: string | null): LocationId | null {
  if (!value) return null;
  return LOCATION_OPTIONS.some((option) => option.id === value) ? (value as LocationId) : null;
}

export default function OrderPage() {
  const [searchParams] = useSearchParams();
  const { selectedLocation, selectedLocationId, setLocation } = useLocationSelection();
  const { bundle } = useHomepageData();
  const orderSectionRef = useRef<HTMLElement>(null);

  const queryLocationId = parseLocationId(searchParams.get("location"));
  const offerCategory = searchParams.get("category")?.trim() ?? "";

  useEffect(() => {
    if (queryLocationId && queryLocationId !== selectedLocationId) {
      setLocation(queryLocationId);
    }
  }, [queryLocationId, selectedLocationId, setLocation]);

  useEffect(() => {
    if (!queryLocationId && !offerCategory) return;
    const timer = window.setTimeout(() => {
      orderSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [offerCategory, queryLocationId]);

  const orderOptions: OrderOption[] = useMemo(() => {
    const orderBase = resolveOrderUrl(bundle.settings, selectedLocationId);
    const directHref =
      offerCategory
        ? buildLocationOrderMenuUrl(orderBase, offerCategory)
        : orderBase;

    return [
      {
        id: "direct",
        brand: "Desi Dhamaka",
        title: "Order Direct",
        badge: offerCategory ? offerCategory : "Pickup Only",
        description: offerCategory
          ? `Continue to order ${offerCategory} from Desi Dhamaka${selectedLocation ? ` ${selectedLocation.shortName}` : ""}.`
          : "Order directly from us for the freshest experience and the best service.",
        image: "/showcase/biryani.jpg",
        imageAlt: "Fresh biryani from Desi Dhamaka",
        pills: ["Fresh Daily", "Best Value", "Personal Service"],
        buttonText: `Order Direct${selectedLocation ? ` - ${selectedLocation.shortName}` : ""}`,
        buttonHref: directHref,
        buttonColor: "#ED3C18",
        variant: "desi",
      },
      {
        id: "uber",
        brand: "Uber Eats",
        title: "Delivery & Pickup",
        badge: "Available Now",
        description: "Enjoy fast delivery or pickup through Uber Eats.",
        image: "/showcase/tandoori.jpg",
        imageAlt: "Tandoori platter available on Uber Eats",
        pills: ["Fast Delivery", "Live Tracking", "Easy Pickup"],
        buttonText: "Order with Uber Eats",
        buttonHref: selectedLocation?.uberEatsLink ?? "/order",
        buttonColor: "#FA9040",
        variant: "uber",
      },
    ];
  }, [offerCategory, selectedLocation, selectedLocationId, bundle.settings]);

  return (
    <div className="order-page">
      <PageHero
        label="Order Online"
        title="Order Online"
        subtitle={`Order authentic Indian food from Desi Dhamaka${selectedLocation ? ` ${selectedLocation.shortName}` : ""}. Choose pickup or delivery — freshly prepared, delivered your way.`}
        backgroundImage="/showcase/biryani.jpg"
        backgroundVideo="/hero/videoplayback.mp4"
        breadcrumbItems={[
          { label: "Home", to: "/" },
          { label: "Order Online" },
        ]}
      />

      {offerCategory ? (
        <div className="order-page__offer-banner page-content-start">
          <p className="order-page__offer-banner-text">
            Ready to order: <strong>{offerCategory}</strong>
            {selectedLocation ? ` at ${selectedLocation.name}` : ""}
          </p>
        </div>
      ) : null}

      <section
        ref={orderSectionRef}
        className={`order-options${offerCategory ? "" : " page-content-start"}`}
        aria-labelledby="order-options-heading"
      >
        <div className="order-page__texture" aria-hidden />
        <div className="order-options__inner">
          <h2 id="order-options-heading" className="sr-only">
            Choose your ordering method
          </h2>
          <div className="order-options__grid">
            {orderOptions.map((option, index) => (
              <OrderOptionCard key={option.id} option={option} index={index} />
            ))}
          </div>
        </div>
      </section>

      <FeatureGrid />
      <Suspense fallback={<SectionPlaceholder minHeight="320px" />}>
        <ReservationCTA />
      </Suspense>
    </div>
  );
}
