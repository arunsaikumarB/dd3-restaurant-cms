import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { RESERVATION_LOCATIONS } from "../../data/reservationPage";
import { usePageContent } from "../../context/PageContentContext";
import { useReservation } from "../../hooks/useReservation";
import { EASE_POWER3, viewportOnce } from "../showcase/motion";

function FieldIcon({ children }: { children: ReactNode }) {
  return (
    <span className="reservation-field__icon" aria-hidden>
      {children}
    </span>
  );
}

const icons = {
  location: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  calendar: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 3v4M16 3v4M3 10h18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
  user: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 20c0-4 3.5-6 7-6s7 2 7 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  phone: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M6.5 4h3l1.5 4-2 1.5c1 2.5 2.8 4.3 5.3 5.3L16 13l4 1.5v3c0 .8-.7 1.5-1.5 1.5C9.8 19 5 14.2 5 7.5 5 6.7 5.7 6 6.5 6V4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  email: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 7l9 6 9-6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

export default function BookingForm() {
  const { fetchSection } = usePageContent();
  const formCopy = fetchSection("reservation", "booking_form", {
    title: "Reserve Your Table",
    subtitle:
      "Fill in your details and we'll confirm your reservation shortly.",
    locationLabel: "Restaurant Location",
    dateLabel: "Date",
    guestsLabel: "Guests",
    timeSlotsLabel: "Available Time Slots",
    loadingSlots: "Finding available times…",
    noSlots: "No times available for this date.",
    nameLabel: "Full Name",
    namePlaceholder: "Your full name",
    phoneLabel: "Phone Number",
    phonePlaceholder: "(555) 123-4567",
    emailLabel: "Email Address",
    emailPlaceholder: "you@example.com",
    requestsLabel: "Special Requests",
    requestsPlaceholder: "Allergies, celebrations, seating preferences…",
    submitLabel: "Reserve Table",
    submittingLabel: "Reserving…",
    successTitle: "Reservation Requested",
    successAnotherLabel: "Make Another Reservation",
  });

  const {
    form,
    timeSlots,
    loadingSlots,
    submitting,
    submitted,
    successMessage,
    error,
    minGuests,
    maxGuests,
    updateField,
    incrementGuests,
    decrementGuests,
    handleSubmit,
    reset,
  } = useReservation();

  const today = new Date().toISOString().slice(0, 10);

  if (submitted) {
    return (
      <motion.div
        className="reservation-form-wrap"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: EASE_POWER3 }}
      >
        <div className="reservation-form">
          <div className="reservation-form__success" role="status">
            <p className="reservation-form__success-title">{formCopy.successTitle}</p>
            <p className="reservation-form__success-text">{successMessage}</p>
            <button
              type="button"
              className="reservation-form__success-btn"
              onClick={reset}
            >
              {formCopy.successAnotherLabel}
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="reservation-form-wrap"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.9, ease: EASE_POWER3, delay: 0.1 }}
    >
      <form
        className="reservation-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        aria-label="Table reservation form"
      >
        <header className="reservation-form__header">
          <h2 className="reservation-form__title">{formCopy.title}</h2>
          <p className="reservation-form__subtitle">{formCopy.subtitle}</p>
        </header>

        <div className="reservation-form__grid">
          <div className="reservation-field">
            <label className="reservation-field__label" htmlFor="location">
              {formCopy.locationLabel}
            </label>
            <div className="reservation-field__control">
              <FieldIcon>{icons.location}</FieldIcon>
              <select
                id="location"
                className="reservation-field__select reservation-field__select--locked"
                value={form.locationId}
                onChange={(e) => updateField("locationId", e.target.value)}
                aria-readonly="true"
                disabled
              >
                {RESERVATION_LOCATIONS.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="reservation-form__row reservation-form__row--2">
            <div className="reservation-field">
              <label className="reservation-field__label" htmlFor="date">
                {formCopy.dateLabel}
              </label>
              <div className="reservation-field__control">
                <FieldIcon>{icons.calendar}</FieldIcon>
                <input
                  id="date"
                  type="date"
                  className="reservation-field__input reservation-field__input--date"
                  value={form.date}
                  min={today}
                  onChange={(e) => updateField("date", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="reservation-field">
              <span className="reservation-field__label">{formCopy.guestsLabel}</span>
              <div className="reservation-guests" role="group" aria-label="Number of guests">
                <button
                  type="button"
                  className="reservation-guests__btn"
                  onClick={decrementGuests}
                  disabled={form.guests <= minGuests}
                  aria-label="Decrease guests"
                >
                  −
                </button>
                <div className="reservation-guests__count">
                  {form.guests}
                  <span className="reservation-guests__label">{formCopy.guestsLabel}</span>
                </div>
                <button
                  type="button"
                  className="reservation-guests__btn"
                  onClick={incrementGuests}
                  disabled={form.guests >= maxGuests}
                  aria-label="Increase guests"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="reservation-field">
            <span className="reservation-field__label">{formCopy.timeSlotsLabel}</span>
            {loadingSlots ? (
              <p className="reservation-slots__loading">{formCopy.loadingSlots}</p>
            ) : timeSlots.length === 0 ? (
              <p className="reservation-slots__loading">{formCopy.noSlots}</p>
            ) : (
              <div className="reservation-slots" role="radiogroup" aria-label="Time slot">
                {timeSlots.map((slot) => (
                  <motion.button
                    key={slot.value}
                    type="button"
                    role="radio"
                    aria-checked={form.time === slot.value}
                    className={
                      "reservation-slot" +
                      (form.time === slot.value ? " reservation-slot--active" : "")
                    }
                    disabled={!slot.available}
                    onClick={() => updateField("time", slot.value)}
                    whileTap={slot.available ? { scale: 0.96 } : undefined}
                  >
                    {slot.label}
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          <div className="reservation-form__row reservation-form__row--2">
            <div className="reservation-field">
              <label className="reservation-field__label" htmlFor="name">
                {formCopy.nameLabel}
              </label>
              <div className="reservation-field__control">
                <FieldIcon>{icons.user}</FieldIcon>
                <input
                  id="name"
                  type="text"
                  className="reservation-field__input"
                  placeholder={formCopy.namePlaceholder}
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="reservation-field">
              <label className="reservation-field__label" htmlFor="phone">
                {formCopy.phoneLabel}
              </label>
              <div className="reservation-field__control">
                <FieldIcon>{icons.phone}</FieldIcon>
                <input
                  id="phone"
                  type="tel"
                  className="reservation-field__input"
                  placeholder={formCopy.phonePlaceholder}
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  required
                  autoComplete="tel"
                />
              </div>
            </div>
          </div>

          <div className="reservation-field">
            <label className="reservation-field__label" htmlFor="email">
              {formCopy.emailLabel}
            </label>
            <div className="reservation-field__control">
              <FieldIcon>{icons.email}</FieldIcon>
              <input
                id="email"
                type="email"
                className="reservation-field__input"
                placeholder={formCopy.emailPlaceholder}
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="reservation-field">
            <label className="reservation-field__label" htmlFor="requests">
              {formCopy.requestsLabel}
            </label>
            <textarea
              id="requests"
              className="reservation-field__textarea"
              placeholder={formCopy.requestsPlaceholder}
              value={form.specialRequests}
              onChange={(e) => updateField("specialRequests", e.target.value)}
              rows={3}
            />
          </div>

          {error && (
            <p className="reservation-form__error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="reservation-form__submit"
            disabled={submitting || loadingSlots}
          >
            {submitting ? formCopy.submittingLabel : formCopy.submitLabel}
            <span className="reservation-form__submit-arrow" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}
