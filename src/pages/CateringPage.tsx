import PageHero from "../components/ui/PageHero";
import SectionHeading from "../components/ui/SectionHeading";
import AnimatedContainer from "../components/ui/AnimatedContainer";
import CTASection from "../components/ui/CTASection";
import { usePageContent } from "../context/PageContentContext";
import { useSectionImage } from "../hooks/useGallerySection";
import { isExternalUrl } from "../utils/locationLinks";

const SERVICES = [
  {
    title: "Corporate Events",
    text: "Impress clients and colleagues with curated menus, elegant presentation and seamless service for conferences, galas and office celebrations.",
    image: "/showcase/indo-chinese.jpg",
    tag: "50–500 Guests",
    section: "catering_corporate" as const,
  },
  {
    title: "Wedding Catering",
    text: "From intimate ceremonies to grand receptions — bespoke menus, live stations and a team dedicated to making your day unforgettable.",
    image: "/showcase/biryani.jpg",
    tag: "Custom Packages",
    section: "catering_wedding" as const,
  },
  {
    title: "Birthday Parties",
    text: "Celebrate milestones with flavour. Custom menus, themed setups and attentive service for gatherings of every size.",
    image: "/showcase/desserts-falooda.jpg",
    tag: "Any Size",
    section: "catering_birthday" as const,
  },
  {
    title: "Live Counters",
    text: "Tandoor, chaat, biryani and dessert counters that bring theatre and aroma to your event — cooked fresh before your guests.",
    image: "/showcase/tandoori.jpg",
    tag: "Live Experience",
    section: "catering_live" as const,
  },
  {
    title: "Custom Menus",
    text: "Vegetarian, halal, spice-level preferences and regional specialities — every menu tailored to your vision and guest list.",
    image: "/showcase/mandi.jpg",
    tag: "Fully Tailored",
    section: "catering_custom" as const,
  },
];

function CateringServiceBlock({
  service,
  index,
}: {
  service: (typeof SERVICES)[number];
  index: number;
}) {
  const image = useSectionImage(service.section, service.image);

  return (
    <AnimatedContainer delay={index * 0.05}>
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div className={index % 2 === 1 ? "lg:order-2" : ""}>
          <img
            src={image}
            alt={service.title}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full rounded-[28px] object-cover shadow-premium"
          />
        </div>
        <div className={index % 2 === 1 ? "lg:order-1" : ""}>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.28em] text-saffron">
            {service.tag}
          </p>
          <h3 className="font-serif text-[clamp(1.75rem,3vw,2.75rem)] leading-tight text-cocoa">
            {service.title}
          </h3>
          <span className="mt-5 mb-5 block h-px w-12 rounded-full bg-saffron/50" aria-hidden />
          <p className="max-w-md text-[16px] leading-[1.75] text-cocoa/60">{service.text}</p>
        </div>
      </div>
    </AnimatedContainer>
  );
}

export default function CateringPage() {
  const { fetchSection } = usePageContent();
  const hero = fetchSection("catering", "hero", {
    label: "Events & Catering",
    title: "Catering",
    subtitle:
      "Elevated Indian cuisine for corporate events, weddings and celebrations — delivered with the same passion as our dining room.",
  });
  const intro = fetchSection("catering", "intro", {
    eyebrow: "Premium Catering",
    title: "Events worth remembering",
    subtitle:
      "Whether you are hosting fifty guests or five hundred, Desi Dhamaka brings restaurant-quality flavour, presentation and service to your venue.",
  });
  const servicesContent = fetchSection("catering", "services", {
    items: SERVICES.map(({ tag, title, text }) => ({ tag, title, text })),
  });
  const cta = fetchSection("catering", "cta", {
    title: "Plan Your Event",
    subtitle: "Tell us about your event and we'll craft the perfect catering experience.",
    cta: { label: "Request a Quote", url: "/contact#catering" },
  });

  const mergedServices = SERVICES.map((service, index) => {
    const cmsItem = servicesContent.items[index];
    return cmsItem
      ? {
          ...service,
          tag: cmsItem.tag,
          title: cmsItem.title,
          text: cmsItem.text,
        }
      : service;
  });

  const heroBackground = useSectionImage("catering_hero", "/showcase/biryani.jpg");

  return (
    <div className="bg-ivory">
      <PageHero
        label={hero.label}
        title={hero.title}
        subtitle={hero.subtitle}
        backgroundImage={heroBackground}
        breadcrumbItems={[
          { label: "Home", to: "/" },
          { label: "Catering" },
        ]}
      />

      <section className="page-content-start mx-auto max-w-[1400px] px-6 pb-24 md:px-10 lg:px-16">
        <SectionHeading
          eyebrow={intro.eyebrow}
          title={intro.title}
          subtitle={intro.subtitle}
          align="center"
        />

        <div className="mt-20 space-y-24">
          {mergedServices.map((service, i) => (
            <CateringServiceBlock key={service.section} service={service} index={i} />
          ))}
        </div>

        <div className="mt-24">
          <CTASection
            title={cta.title}
            subtitle={cta.subtitle}
            buttonLabel={cta.cta.label}
            buttonTo={isExternalUrl(cta.cta.url) ? undefined : cta.cta.url}
            buttonHref={isExternalUrl(cta.cta.url) ? cta.cta.url : undefined}
          />
        </div>
      </section>
    </div>
  );
}
