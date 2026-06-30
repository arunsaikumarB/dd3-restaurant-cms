import ReservationInfo from "../components/reservation/ReservationInfo";
import BookingForm from "../components/reservation/BookingForm";
import FeatureCards from "../components/reservation/FeatureCards";
import ImageGallery from "../components/reservation/ImageGallery";
import ContactCards from "../components/reservation/ContactCards";
import GoogleMap from "../components/reservation/GoogleMap";
import { useLocationSelection } from "../context/LocationContext";
import { useHomepageData } from "../hooks/useHomepageData";
import { isExternalUrl, resolveReservationUrl } from "../utils/locationLinks";
import "../components/reservation/reservation.css";

export default function ReservationPage() {
  const { selectedLocationId } = useLocationSelection();
  const { bundle } = useHomepageData();
  const reservationLink = resolveReservationUrl(bundle.settings, selectedLocationId);
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
          <BookingForm />
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
          {isExternalUrl(reservationLink)
            ? "Reserve Online"
            : "Reserve My Table"}
        </button>
      </div>
    </div>
  );
}
