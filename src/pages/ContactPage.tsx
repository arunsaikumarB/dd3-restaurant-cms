import PageHero from "../components/ui/PageHero";
import SectionHeading from "../components/ui/SectionHeading";
import AnimatedContainer from "../components/ui/AnimatedContainer";
import Button from "../components/ui/Button";
import CTASection from "../components/ui/CTASection";
import { SITE } from "../constants/site";
import { useContactForm } from "../hooks/useContactForm";

export default function ContactPage() {
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

  return (
    <div className="bg-ivory">
      <PageHero
        label="Get in Touch"
        title="Contact"
        subtitle="We'd love to hear from you — reservations, catering enquiries or simply a hello."
        backgroundImage="/showcase/mandi.jpg"
        breadcrumbItems={[
          { label: "Home", to: "/" },
          { label: "Contact" },
        ]}
      />

      <section className="page-content-start mx-auto max-w-[1400px] px-6 pb-20 md:px-10 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Get in Touch"
              title="Visit or reach out"
              subtitle="Our team is ready to assist with reservations, private events and catering requests."
            />

            <AnimatedContainer delay={0.1} className="mt-10 space-y-6">
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-label text-saffron">
                  Address
                </h3>
                <p className="mt-2 text-[16px] text-cocoa/70">{SITE.address}</p>
              </div>
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-label text-saffron">
                  Phone
                </h3>
                <a
                  href={`tel:${SITE.phone.replace(/\D/g, "")}`}
                  className="mt-2 block text-[16px] text-cocoa/70 hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                >
                  {SITE.phone}
                </a>
              </div>
              <div>
                <h3 className="text-[12px] font-semibold uppercase tracking-label text-saffron">
                  Email
                </h3>
                <a
                  href={`mailto:${SITE.email}`}
                  className="mt-2 block text-[16px] text-cocoa/70 hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                >
                  {SITE.email}
                </a>
              </div>
              <div id="reserve">
                <h3 className="text-[12px] font-semibold uppercase tracking-label text-saffron">
                  Business Hours
                </h3>
                <ul className="mt-2 space-y-1">
                  {SITE.hours.map((row) => (
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
                Send a message
              </h3>

              {submitted ? (
                <div className="mt-6" role="status">
                  <p className="text-[16px] text-cocoa/70">{successMessage}</p>
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-4 text-[14px] font-medium text-saffron underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <div className="mt-6 space-y-4">
                  {error && (
                    <p className="rounded-xl bg-red-50 px-4 py-3 text-[14px] text-red-700" role="alert">
                      {error}
                    </p>
                  )}

                  <div>
                    <label htmlFor="contact-name" className="form-label">
                      Name
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="Your name"
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="form-label">
                      Email
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="Email address"
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-phone" className="form-label">
                      Phone
                    </label>
                    <input
                      id="contact-phone"
                      name="phone"
                      type="tel"
                      required
                      autoComplete="tel"
                      value={form.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="Phone number"
                      className="form-input"
                    />
                  </div>

                  <div>
                    <label htmlFor="contact-message" className="form-label">
                      Message
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => updateField("message", e.target.value)}
                      placeholder="How can we help?"
                      className="form-input resize-none"
                    />
                  </div>

                  <Button type="submit" variant="primary" disabled={submitting}>
                    {submitting ? "Sending…" : "Send Message"}
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
              src={SITE.mapEmbed}
              className="aspect-[16/7] w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </AnimatedContainer>
      </section>

      <section
        id="parties"
        className="mx-auto max-w-[1400px] px-6 pb-20 md:px-10 lg:px-16"
      >
        <CTASection
          title="Ready to Experience Desi Dhamaka?"
          subtitle="Reserve Your Table Today"
          buttonLabel="Reserve Now"
          buttonTo="/reservation"
        />
      </section>
    </div>
  );
}
