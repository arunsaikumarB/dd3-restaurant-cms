import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { useCateringQuoteForm } from "../../hooks/useCateringQuoteForm";
import { usePageContent } from "../../context/PageContentContext";

const EVENT_TYPES = [
  "Corporate Event",
  "Wedding",
  "Birthday Party",
  "Private Celebration",
  "Live Counter / Station",
  "Other",
];

interface CateringQuoteModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CateringQuoteModal({ open, onClose }: CateringQuoteModalProps) {
  const { fetchSection } = usePageContent();
  const copy = fetchSection("catering", "quote_form", {
    title: "Request a Quote",
    subtitle: "Share your event details and our team will prepare a tailored proposal.",
    nameLabel: "Full Name",
    namePlaceholder: "Your name",
    emailLabel: "Email",
    emailPlaceholder: "Email address",
    phoneLabel: "Phone",
    phonePlaceholder: "Phone number",
    eventTypeLabel: "Event Type",
    eventTypePlaceholder: "Select event type",
    eventDateLabel: "Event Date",
    guestCountLabel: "Guest Count",
    guestCountPlaceholder: "e.g. 75",
    messageLabel: "Event Details",
    messagePlaceholder: "Venue, menu preferences, dietary needs, budget range…",
    submitLabel: "Submit Request",
    submittingLabel: "Sending…",
    sendAnotherLabel: "Submit another request",
    closeLabel: "Close",
  });

  const {
    form,
    submitting,
    submitted,
    successMessage,
    error,
    updateField,
    handleSubmit,
    reset,
  } = useCateringQuoteForm();

  const handleClose = () => {
    onClose();
    window.setTimeout(reset, 300);
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={copy.title}
      subtitle={copy.subtitle}
    >
      {submitted ? (
        <div role="status">
          <div className="rounded-[20px] border border-saffron/20 bg-saffron/8 px-5 py-4">
            <p className="font-serif text-[1.15rem] text-cocoa">Request received</p>
            <p className="mt-2 text-[15px] leading-relaxed text-cocoa/70">{successMessage}</p>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="button" onClick={reset}>
              {copy.sendAnotherLabel}
            </Button>
            <Button type="button" variant="ghost" onClick={handleClose}>
              {copy.closeLabel}
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {error && (
            <p
              className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="catering-name" className="form-label">
                {copy.nameLabel}
              </label>
              <input
                id="catering-name"
                name="name"
                type="text"
                required
                autoComplete="name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder={copy.namePlaceholder}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="catering-email" className="form-label">
                {copy.emailLabel}
              </label>
              <input
                id="catering-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder={copy.emailPlaceholder}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="catering-phone" className="form-label">
                {copy.phoneLabel}
              </label>
              <input
                id="catering-phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder={copy.phonePlaceholder}
                className="form-input"
              />
            </div>

            <div>
              <label htmlFor="catering-event-type" className="form-label">
                {copy.eventTypeLabel}
              </label>
              <select
                id="catering-event-type"
                name="eventType"
                required
                value={form.eventType}
                onChange={(e) => updateField("eventType", e.target.value)}
                className="form-input appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%20stroke%3D%22%232b1d18%22%20stroke-width%3D%221.75%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_1rem_center] bg-no-repeat pr-10"
              >
                <option value="">{copy.eventTypePlaceholder}</option>
                {EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="catering-event-date" className="form-label">
                {copy.eventDateLabel}
              </label>
              <input
                id="catering-event-date"
                name="eventDate"
                type="date"
                required
                value={form.eventDate}
                onChange={(e) => updateField("eventDate", e.target.value)}
                className="form-input"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="catering-guest-count" className="form-label">
                {copy.guestCountLabel}
              </label>
              <input
                id="catering-guest-count"
                name="guestCount"
                type="number"
                min={1}
                required
                value={form.guestCount}
                onChange={(e) => updateField("guestCount", e.target.value)}
                placeholder={copy.guestCountPlaceholder}
                className="form-input"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="catering-message" className="form-label">
                {copy.messageLabel}
              </label>
              <textarea
                id="catering-message"
                name="message"
                required
                rows={4}
                value={form.message}
                onChange={(e) => updateField("message", e.target.value)}
                placeholder={copy.messagePlaceholder}
                className="form-input resize-none"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? copy.submittingLabel : copy.submitLabel}
            </Button>
            <Button type="button" variant="ghost" onClick={handleClose}>
              {copy.closeLabel}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
