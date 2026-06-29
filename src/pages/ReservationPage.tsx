import ReservationInfo from "../components/reservation/ReservationInfo";
import BookingForm from "../components/reservation/BookingForm";
import FeatureCards from "../components/reservation/FeatureCards";
import ImageGallery from "../components/reservation/ImageGallery";
import ContactCards from "../components/reservation/ContactCards";
import GoogleMap from "../components/reservation/GoogleMap";
import PageHero from "../components/ui/PageHero";
import "../components/reservation/reservation.css";

export default function ReservationPage() {
  const scrollToBooking = () => {
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="reservation-page">
      <div className="reservation-page__texture" aria-hidden />
      <div className="reservation-page__pattern" aria-hidden />

      <PageHero
        label="Reservations"
        title="Reserve Your Table"
        subtitle="Experience authentic Indian hospitality, unforgettable flavours, and elegant dining."
        backgroundImage="/reservation/interior/interior-01.png"
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
          Reserve My Table
        </button>
      </div>
    </div>
  );
}
