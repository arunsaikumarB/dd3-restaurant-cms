import PageHero from "../components/ui/PageHero";
import SectionHeading from "../components/ui/SectionHeading";
import AnimatedContainer from "../components/ui/AnimatedContainer";
import CTASection from "../components/ui/CTASection";

const SERVICES = [
  {
    title: "Corporate Events",
    text: "Impress clients and colleagues with curated menus, elegant presentation and seamless service for conferences, galas and office celebrations.",
    image: "/showcase/indo-chinese.jpg",
    tag: "50–500 Guests",
  },
  {
    title: "Wedding Catering",
    text: "From intimate ceremonies to grand receptions — bespoke menus, live stations and a team dedicated to making your day unforgettable.",
    image: "/showcase/biryani.jpg",
    tag: "Custom Packages",
  },
  {
    title: "Birthday Parties",
    text: "Celebrate milestones with flavour. Custom menus, themed setups and attentive service for gatherings of every size.",
    image: "/showcase/desserts-falooda.jpg",
    tag: "Any Size",
  },
  {
    title: "Live Counters",
    text: "Tandoor, chaat, biryani and dessert counters that bring theatre and aroma to your event — cooked fresh before your guests.",
    image: "/showcase/tandoori.jpg",
    tag: "Live Experience",
  },
  {
    title: "Custom Menus",
    text: "Vegetarian, halal, spice-level preferences and regional specialities — every menu tailored to your vision and guest list.",
    image: "/showcase/mandi.jpg",
    tag: "Fully Tailored",
  },
];

export default function CateringPage() {
  return (
    <div className="bg-ivory">
      <PageHero
        label="Events & Catering"
        title="Catering"
        subtitle="Elevated Indian cuisine for corporate events, weddings and celebrations — delivered with the same passion as our dining room."
        backgroundImage="/showcase/biryani.jpg"
        breadcrumbItems={[
          { label: "Home", to: "/" },
          { label: "Catering" },
        ]}
      />

      <section className="page-content-start mx-auto max-w-[1400px] px-6 pb-24 md:px-10 lg:px-16">
        <SectionHeading
          eyebrow="Premium Catering"
          title="Events worth remembering"
          subtitle="Whether you are hosting fifty guests or five hundred, Desi Dhamaka brings restaurant-quality flavour, presentation and service to your venue."
          align="center"
        />

        <div className="mt-20 space-y-24">
          {SERVICES.map((service, i) => (
            <AnimatedContainer key={service.title} delay={i * 0.05}>
              <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
                <div className={i % 2 === 1 ? "lg:order-2" : ""}>
                  <img
                    src={service.image}
                    alt={service.title}
                    loading="lazy"
                    className="aspect-[4/3] w-full rounded-[28px] object-cover shadow-premium"
                  />
                </div>
                <div className={i % 2 === 1 ? "lg:order-1" : ""}>
                  <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-saffron">
                    {service.tag}
                  </p>
                  <h3 className="font-serif text-[clamp(1.75rem,3vw,2.75rem)] leading-tight text-cocoa">
                    {service.title}
                  </h3>
                  <span className="mt-5 mb-5 block h-px w-12 rounded-full bg-saffron/50" aria-hidden />
                  <p className="max-w-md text-[16px] leading-[1.75] text-cocoa/60">
                    {service.text}
                  </p>
                </div>
              </div>
            </AnimatedContainer>
          ))}
        </div>

        <div className="mt-24">
          <CTASection
            title="Plan Your Event"
            subtitle="Tell us about your event and we'll craft the perfect catering experience."
            buttonLabel="Request a Quote"
            buttonTo="/contact#catering"
          />
        </div>
      </section>
    </div>
  );
}
