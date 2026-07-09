import PageHero from "../components/ui/PageHero";
import SectionHeading from "../components/ui/SectionHeading";
import AnimatedContainer from "../components/ui/AnimatedContainer";
import Button from "../components/ui/Button";
import CTASection from "../components/ui/CTASection";
import { usePageContent } from "../context/PageContentContext";
import { useHomepageData } from "../hooks/useHomepageData";
import { useLocationSelection } from "../context/LocationContext";
import { formatOpeningHoursRows } from "../services/homepagePublic";
import { useContactForm } from "../hooks/useContactForm";
import { useSectionImage } from "../hooks/useGallerySection";
import PhoneLinks from "../components/ui/PhoneLinks";
import { resolveReservationUrl, isExternalUrl } from "../utils/locationLinks";

export default function ContactPage() {
  const { fetchSection, interpolate } = usePageContent();
  const { bundle } = useHomepageData();
  const { selectedLocationId } = useLocationSelection();
  const { settings } = bundle;
  const hoursRows = formatOpeningHoursRows(settings.opening_hours);
  const reservationLink = resolveReservationUrl(settings, selectedLocationId);
  const reservationIsExternal = isExternalUrl(reservationLink);
  const {
    form,
    submitting,
    submitted,
    successMessage,
    error,
    updateField,
    handleSubmit,
    reset,
  } = useContactForm();
  const heroBackground = useSectionImage("contact_hero", "/showcase/mandi.webp");

  const hero = fetchSection("contact", "hero", {
    label: "Get in Touch",
    title: "Contact",
    subtitleTemplate:
      "We'd love to hear from you in {location} — reservations, catering enquiries or simply a hello.",
  });
  const infoSection = fetchSection("contact", "info_section", {
    eyebrow: "Get in Touch",
    title: "Visit or reach out",
    subtitle:
      "Our team is ready to assist with reservations, private events and catering requests.",
    addressLabel: "Address",
    phoneLabel: "Phone",
    emailLabel: "Email",
    hoursLabel: "Business Hours",
  });
  const formCopy = fetchSection("contact", "form", {
    heading: "Send a message",
    nameLabel: "Name",
    namePlaceholder: "Your name",
    emailLabel: "Email",
    emailPlaceholder: "Email address",
    phoneLabel: "Phone",
    phonePlaceholder: "Phone number",
    messageLabel: "Message",
    messagePlaceholder: "How can we help?",
    submitLabel: "Send Message",
    submittingLabel: "Sending…",
    sendAnotherLabel: "Send another message",
  });
  const heroSubtitle = interpolate(hero.subtitleTemplate);
  const bottomCta = fetchSection("contact", "bottom_cta", {
    title: "Ready to Experience Desi Dhamaka?",
    subtitle: "Reserve Your Table Today",
    reserveNowLabel: "Reserve Now",
    reserveOnlineLabel: "Reserve Online",
  });

  return (
    <div className="bg-ivory">
      <PageHero
        label={hero.label}
        title={hero.title}
        subtitle={heroSubtitle}
        backgroundImage={heroBackground}
        breadcrumbItems={[
          { label: "Home", to: "/" },
          { label: "Contact" },
        ]}
      />

      <section className="page-content-start mx-auto max-w-[1400px] px-6 pb-20 md:px-10 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow={infoSection.eyebrow}
              title={infoSection.title}
              subtitle={infoSection.subtitle}
            />

            <AnimatedContainer delay={0.1} className="mt-10 space-y-6">
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-label text-saffron">
                  {infoSection.addressLabel}
                </h3>
                <p className="mt-2 text-[16px] text-cocoa/70">{settings.address}</p>
              </div>
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-label text-saffron">
                  {infoSection.phoneLabel}
                </h3>
                <div className="mt-2">
                  <PhoneLinks phones={settings.phones} />
                </div>
              </div>
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-label text-saffron">
                  {infoSection.emailLabel}
                </h3>
                <a
                  href={`mailto:${settings.email}`}
                  className="mt-2 block text-[16px] text-cocoa/70 hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                >
                  {settings.email}
                </a>
              </div>
              <div id="reserve">
                <h3 className="text-[12px] font-semibold uppercase tracking-label text-saffron">
                  {infoSection.hoursLabel}
                </h3>
                <ul className="mt-2 space-y-1">
                  {hoursRows.map((row) => (
                    <li
                      key={row.days}
                      className="flex justify-between gap-4 text-[15px] text-cocoa/70"
                    >
                      <span>{row.days}</span>
                      <span>{row.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedContainer>
          </div>

          <AnimatedContainer delay={0.15}>
            <section id="catering" aria-labelledby="catering-form-title">
              <form
                id="contact-form"
                onSubmit={handleSubmit}
                noValidate
                className="rounded-[24px] bg-[#FDFBF7] p-8 shadow-premium md:p-10"
                aria-label="Contact form"
              >
                <h3 id="catering-form-title" className="font-serif text-2xl text-cocoa">
                  {formCopy.heading}
                </h3>

                {submitted ? (
                  <div className="mt-6" role="status">
                    <p className="text-[16px] text-cocoa/70">{successMessage}</p>
                    <button
                      type="button"
                      onClick={reset}
                      className="mt-4 text-[14px] font-medium text-saffron underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                    >
                      {formCopy.sendAnotherLabel}
                    </button>
                  </div>
                ) : (
                  <div className="mt-6 space-y-4">
                    {error && (
                      <p
                        className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700"
                        role="alert"
                      >
                        {error}
                      </p>
                    )}

                    <div>
                      <label htmlFor="contact-name" className="form-label">
                        {formCopy.nameLabel}
                      </label>
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        required
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder={formCopy.namePlaceholder}
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-email" className="form-label">
                        {formCopy.emailLabel}
                      </label>
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => updateField("email", e.target.value)}
                        placeholder={formCopy.emailPlaceholder}
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-phone" className="form-label">
                        {formCopy.phoneLabel}
                      </label>
                      <input
                        id="contact-phone"
                        name="phone"
                        type="tel"
                        required
                        autoComplete="tel"
                        value={form.phone}
                        onChange={(e) => updateField("phone", e.target.value)}
                        placeholder={formCopy.phonePlaceholder}
                        className="form-input"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact-message" className="form-label">
                        {formCopy.messageLabel}
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        required
                        rows={5}
                        value={form.message}
                        onChange={(e) => updateField("message", e.target.value)}
                        placeholder={formCopy.messagePlaceholder}
                        className="form-input resize-none"
                      />
                    </div>

                    <Button type="submit" variant="primary" disabled={submitting}>
                      {submitting ? formCopy.submittingLabel : formCopy.submitLabel}
                    </Button>
                  </div>
                )}
              </form>
            </section>
          </AnimatedContainer>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-10 md:px-10 lg:px-16">
        <AnimatedContainer>
          <div className="overflow-hidden rounded-[24px] shadow-premium">
            <iframe
              title="Desi Dhamaka location on Google Maps"
              src={settings.google_maps}
              className="aspect-[16/7] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </AnimatedContainer>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-24 md:px-10 lg:px-16">
        <CTASection
          title={bottomCta.title}
          subtitle={bottomCta.subtitle}
          buttonLabel={reservationIsExternal ? bottomCta.reserveOnlineLabel : bottomCta.reserveNowLabel}
          buttonTo={reservationIsExternal ? undefined : reservationLink}
          buttonHref={reservationIsExternal ? reservationLink : undefined}
        />
      </section>
    </div>
  );
}
