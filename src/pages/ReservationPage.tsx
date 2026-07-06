import ReservationInfo from "../components/reservation/ReservationInfo";
import BookingForm from "../components/reservation/BookingForm";
import OpenTableReservationPanel from "../components/reservation/OpenTableReservationPanel";
import FeatureCards from "../components/reservation/FeatureCards";
import ImageGallery from "../components/reservation/ImageGallery";
import ContactCards from "../components/reservation/ContactCards";
import GoogleMap from "../components/reservation/GoogleMap";
import PageHero from "../components/ui/PageHero";
import { usePageContent } from "../context/PageContentContext";
import { useLocationSelection } from "../context/LocationContext";
import { useHomepageData } from "../hooks/useHomepageData";
import { resolveExternalReservationUrl } from "../utils/locationLinks";
import "../components/reservation/reservation.css";

export default function ReservationPage() {
  const { fetchSection, interpolate } = usePageContent();
  const { selectedLocationId } = useLocationSelection();
  const { bundle } = useHomepageData();
  const externalReservationUrl = resolveExternalReservationUrl(
    bundle.settings,
    selectedLocationId,
  );
  const usesOpenTable = Boolean(externalReservationUrl);

  const hero = fetchSection("reservation", "hero", {
    label: "Reservations",
    title: "Reserve Your Table",
    subtitleTemplate:
      "Experience authentic Indian hospitality, unforgettable flavours, and elegant dining at {location}.",
  });
  const stickyCta = fetchSection("reservation", "sticky_cta", {
    reserveTableLabel: "Reserve My Table",
    reserveOnlineLabel: "Reserve on OpenTable",
  });

  const heroSubtitle = interpolate(hero.subtitleTemplate);

  const scrollToBooking = () => {
    if (usesOpenTable && externalReservationUrl) {
      window.open(externalReservationUrl, "_blank", "noopener,noreferrer");
      return;
    }
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="reservation-page">
      <div className="reservation-page__texture" aria-hidden />
      <div className="reservation-page__pattern" aria-hidden />

      <PageHero
        label={hero.label}
        title={hero.title}
        subtitle={heroSubtitle}
        backgroundImage="/reservation/interior/interior-01.webp"
        breadcrumbItems={[
          { label: "Home", to: "/" },
          { label: "Reservation" },
        ]}
      />

      <section
        id="booking"
        className="reservation-booking page-content-start"
        aria-labelledby="booking-section-title"
      >
        <h2 id="booking-section-title" className="sr-only">
          Book a table
        </h2>
        <div className="reservation-booking__inner">
          <ReservationInfo />
          {usesOpenTable && externalReservationUrl ? (
            <OpenTableReservationPanel openTableUrl={externalReservationUrl} />
          ) : (
            <BookingForm />
          )}
        </div>
      </section>

      <FeatureCards />
      <ImageGallery />
      <ContactCards />
      <GoogleMap />

      <div className="reservation-sticky">
        <button
          type="button"
          className="reservation-sticky__btn"
          onClick={scrollToBooking}
        >
          {usesOpenTable ? stickyCta.reserveOnlineLabel : stickyCta.reserveTableLabel}
        </button>
      </div>
    </div>
  );
}
