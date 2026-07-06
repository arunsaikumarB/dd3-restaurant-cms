import ReservationHero from "../components/reservation/ReservationHero";
import BookingForm from "../components/reservation/BookingForm";
import ReservationWhyDine from "../components/reservation/ReservationWhyDine";
import ReservationPolicy from "../components/reservation/ReservationPolicy";
import ContactCards from "../components/reservation/ContactCards";
import { usePageContent } from "../context/PageContentContext";
import { useLocationSelection } from "../context/LocationContext";
import { useHomepageData } from "../hooks/useHomepageData";
import { isExternalUrl, resolveReservationUrl } from "../utils/locationLinks";
import "../components/reservation/reservation.css";

export default function ReservationPage() {
  const { fetchSection } = usePageContent();
  const { selectedLocationId } = useLocationSelection();
  const { bundle } = useHomepageData();
  const reservationLink = resolveReservationUrl(bundle.settings, selectedLocationId);

  const stickyCta = fetchSection("reservation", "sticky_cta", {
    reserveTableLabel: "Reserve Table",
    reserveOnlineLabel: "Reserve Online",
  });

  const scrollToBooking = () => {
    if (isExternalUrl(reservationLink)) {
      window.open(reservationLink, "_blank", "noopener,noreferrer");
      return;
    }
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="reservation-page">
      <div className="reservation-page__texture" aria-hidden />
      <div className="reservation-page__pattern" aria-hidden />

      <ReservationHero />

      <section
        id="booking"
        className="reservation-experience"
        aria-labelledby="booking-section-title"
      >
        <h2 id="booking-section-title" className="sr-only">
          Book a table
        </h2>

        <div className="reservation-experience__inner">
          <div className="reservation-experience__form-col">
            <BookingForm />
          </div>
          <div className="reservation-experience__aside-col">
            <ReservationWhyDine />
          </div>
        </div>
      </section>

      <ReservationPolicy />
      <ContactCards />

      <div className="reservation-sticky">
        <button
          type="button"
          className="reservation-sticky__btn"
          onClick={scrollToBooking}
        >
          {isExternalUrl(reservationLink)
            ? stickyCta.reserveOnlineLabel
            : stickyCta.reserveTableLabel}
        </button>
      </div>
    </div>
  );
}
