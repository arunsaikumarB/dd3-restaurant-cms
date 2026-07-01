import { lazy, Suspense, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ORDER_OPTIONS, type OrderOption } from "../data/orderPage";
import PageHero from "../components/ui/PageHero";
import OrderOptionCard from "../components/order/OrderOptionCard";
import FeatureGrid from "../components/order/FeatureGrid";
import SectionPlaceholder from "../components/ui/SectionPlaceholder";
import { LOCATION_OPTIONS, type LocationId } from "../config/locations";
import { buildLocationOrderMenuUrl } from "../constants/ordering";
import { useLocationSelection } from "../context/LocationContext";
import { usePageContent } from "../context/PageContentContext";
import { useHomepageData } from "../hooks/useHomepageData";
import { resolveOrderUrl } from "../utils/locationLinks";
import "../components/order/order.css";

const ReservationCTA = lazy(() => import("../components/order/ReservationCTA"));

const ORDER_OPTION_META: Record<
  string,
  Pick<OrderOption, "image" | "buttonColor" | "variant">
> = {
  direct: { image: "/showcase/biryani.jpg", buttonColor: "#ED3C18", variant: "desi" },
  uber: { image: "/showcase/tandoori.jpg", buttonColor: "#FA9040", variant: "uber" },
};

type OrderOptionCmsItem = {
  id: string;
  brand: string;
  title: string;
  badge: string;
  description: string;
  imageAlt: string;
  pills?: unknown;
  buttonText: string;
  buttonTextTemplate?: string;
};

function normalizePills(pills: unknown, fallback: string[]): string[] {
  if (Array.isArray(pills)) {
    const normalized = pills
      .map((entry) =>
        typeof entry === "string" ? entry : (entry as { text?: string }).text ?? "",
      )
      .filter(Boolean);
    return normalized.length > 0 ? normalized : fallback;
  }
  return fallback;
}

function parseLocationId(value: string | null): LocationId | null {
  if (!value) return null;
  return LOCATION_OPTIONS.some((option) => option.id === value) ? (value as LocationId) : null;
}

const ORDER_OPTIONS_FALLBACK = {
  srOnlyHeading: "Choose your ordering method",
  items: ORDER_OPTIONS.map((option) => ({
    id: option.id,
    brand: option.brand,
    title: option.title,
    badge: option.badge,
    description: option.description,
    imageAlt: option.imageAlt,
    pills: option.pills.map((text) => ({ text })),
    buttonText: option.buttonText,
    ...(option.id === "direct"
      ? { buttonTextTemplate: "Order Direct - {location}" }
      : {}),
  })),
};

export default function OrderPage() {
  const [searchParams] = useSearchParams();
  const { fetchSection, interpolate } = usePageContent();
  const { selectedLocation, selectedLocationId, setLocation } = useLocationSelection();
  const { bundle, locationId: bundleLocationId } = useHomepageData();
  const orderSectionRef = useRef<HTMLElement>(null);

  const queryLocationId = parseLocationId(searchParams.get("location"));
  const offerCategory = searchParams.get("category")?.trim() ?? "";

  const orderOptionsContent = fetchSection("order", "order_options", ORDER_OPTIONS_FALLBACK);

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
    const orderBase = resolveOrderUrl(bundle.settings, selectedLocationId, bundleLocationId);
    const directHref = offerCategory
      ? buildLocationOrderMenuUrl(orderBase, offerCategory)
      : orderBase;

    return orderOptionsContent.items.map((cmsItem: OrderOptionCmsItem, index: number) => {
      const fallback = ORDER_OPTIONS.find((option) => option.id === cmsItem.id) ?? ORDER_OPTIONS[index];
      const meta = ORDER_OPTION_META[cmsItem.id] ?? {
        image: fallback.image,
        buttonColor: fallback.buttonColor,
        variant: fallback.variant,
      };

      const isDirect = cmsItem.id === "direct";

      let badge = cmsItem.badge || fallback.badge;
      let description = cmsItem.description || fallback.description;
      let buttonText =
        cmsItem.buttonTextTemplate && !offerCategory
          ? interpolate(cmsItem.buttonTextTemplate)
          : cmsItem.buttonText || fallback.buttonText;

      if (isDirect && offerCategory) {
        badge = offerCategory;
        description = `Continue to order ${offerCategory} from Desi Dhamaka${
          selectedLocation ? ` ${selectedLocation.shortName}` : ""
        }.`;
        buttonText = cmsItem.buttonTextTemplate
          ? interpolate(cmsItem.buttonTextTemplate)
          : `Order Direct${selectedLocation ? ` - ${selectedLocation.shortName}` : ""}`;
      } else if (isDirect && cmsItem.buttonTextTemplate) {
        buttonText = interpolate(cmsItem.buttonTextTemplate);
      }

      return {
        id: cmsItem.id,
        brand: cmsItem.brand || fallback.brand,
        title: cmsItem.title || fallback.title,
        badge,
        description,
        image: meta.image,
        imageAlt: cmsItem.imageAlt || fallback.imageAlt,
        pills: normalizePills(cmsItem.pills, fallback.pills),
        buttonText,
        buttonHref: isDirect ? directHref : selectedLocation?.uberEatsLink ?? "/order",
        buttonColor: meta.buttonColor,
        variant: meta.variant,
      };
    });
  }, [
    offerCategory,
    selectedLocation,
    selectedLocationId,
    bundle.settings,
    bundleLocationId,
    orderOptionsContent.items,
    interpolate,
  ]);

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
            {orderOptionsContent.srOnlyHeading}
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
