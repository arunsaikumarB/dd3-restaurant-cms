import ReservationHero from "../components/reservation/ReservationHero";
import BookingForm from "../components/reservation/BookingForm";
import ContactCards from "../components/reservation/ContactCards";
import GoogleMap from "../components/reservation/GoogleMap";
import "../components/reservation/reservation.css";

export default function ReservationPage() {
  return (
    <div className="reservation-page">
      <div className="reservation-page__texture" aria-hidden />
      <div className="reservation-page__pattern" aria-hidden />

      <ReservationHero />

      <section
        id="booking"
        className="reservation-booking reservation-booking--direct"
        aria-labelledby="booking-section-title"
      >
        <h2 id="booking-section-title" className="sr-only">
          Book a table
        </h2>
        <div className="reservation-booking__inner reservation-booking__inner--centered">
          <BookingForm />
        </div>
      </section>

      <ContactCards />
      <GoogleMap />
    </div>
  );
}
