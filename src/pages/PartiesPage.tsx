import PageHero from "../components/ui/PageHero";
import SectionHeading from "../components/ui/SectionHeading";
import AnimatedContainer from "../components/ui/AnimatedContainer";
import CTASection from "../components/ui/CTASection";
import GalleryGrid from "../components/ui/GalleryGrid";
import { usePageContent } from "../context/PageContentContext";
import { useGallerySection, useSectionImage } from "../hooks/useGallerySection";
import { toGalleryGridImages } from "../services/galleryPublic";
import { isExternalUrl } from "../utils/locationLinks";

const EVENTS = [
  { title: "Private Dining", text: "An intimate room for exclusive gatherings — personalised menus, dedicated service and complete privacy.", icon: "◈" },
  { title: "Birthday Celebrations", text: "Make their day extraordinary with custom décor, curated menus and a celebration they'll never forget.", icon: "✦" },
  { title: "Graduation", text: "Mark the milestone with a feast worthy of the achievement — family-style or plated service available.", icon: "◆" },
  { title: "Anniversary", text: "Romantic settings, candlelit ambience and dishes crafted for two or twenty.", icon: "♦" },
  { title: "Corporate Gatherings", text: "Team dinners, product launches and executive meetings in a refined, private setting.", icon: "◉" },
  { title: "Cultural Events", text: "Celebrate milestones and traditions with authentic cuisine and curated hospitality.", icon: "❋" },
];

export default function PartiesPage() {
  const { fetchSection } = usePageContent();
  const hero = fetchSection("parties", "hero", {
    label: "Private Events",
    title: "Private Parties",
    subtitle:
      "Luxury private dining and event spaces for celebrations that deserve something extraordinary.",
  });
  const eventsIntro = fetchSection("parties", "events_intro", {
    eyebrow: "Luxury Events",
    title: "Celebrate in style",
    subtitle:
      "From intimate dinners to grand celebrations, our private party experience combines exceptional cuisine with impeccable service.",
  });
  const eventsContent = fetchSection("parties", "events", {
    items: EVENTS.map(({ title, text }) => ({ title, text })),
  });
  const galleryHeading = fetchSection("parties", "gallery_heading", {
    eyebrow: "Gallery",
    title: "Moments we create",
  });
  const cta = fetchSection("parties", "cta", {
    title: "Book Your Private Event",
    subtitle: "Let us create an unforgettable celebration tailored to you.",
    cta: { label: "Book Now", url: "/contact#parties" },
  });

  const mergedEvents = eventsContent.items.map((item, index) => ({
    ...item,
    icon: EVENTS[index]?.icon ?? "◈",
  }));

  const heroBackground = useSectionImage("parties_hero", "/showcase/desserts-falooda.webp");
  const partyGalleryImages = useGallerySection("parties_gallery");
  const galleryImages = toGalleryGridImages(partyGalleryImages);

  return (
    <div className="bg-ivory">
      <PageHero
        label={hero.label}
        title={hero.title}
        subtitle={hero.subtitle}
        backgroundImage={heroBackground}
        breadcrumbItems={[
          { label: "Home", to: "/" },
          { label: "Parties" },
        ]}
      />

      <section className="page-content-start mx-auto max-w-[1400px] px-6 pb-24 md:px-10 lg:px-16">
        <SectionHeading
          eyebrow={eventsIntro.eyebrow}
          title={eventsIntro.title}
          subtitle={eventsIntro.subtitle}
          align="center"
        />

        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {mergedEvents.map((event, i) => (
            <AnimatedContainer
              key={event.title}
              delay={i * 0.06}
              className="group rounded-[24px] border border-cocoa/5 bg-[#FDFBF7] p-8 shadow-[0_8px_32px_-12px_rgba(43,29,24,0.12)] transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-saffron/30 hover:shadow-[0_24px_56px_-18px_rgba(43,29,24,0.2)]"
            >
              <span
                className="mb-4 block text-xl text-saffron/70 transition-all duration-300 group-hover:text-saffron"
                aria-hidden
              >
                {event.icon}
              </span>
              <h3 className="font-serif text-[1.4rem] leading-snug text-cocoa">{event.title}</h3>
              <span
                className="mt-3 mb-4 block h-px w-8 rounded-full bg-saffron/35 transition-all duration-300 group-hover:w-14 group-hover:bg-saffron/60"
                aria-hidden
              />
              <p className="text-[14.5px] leading-[1.7] text-cocoa/58">{event.text}</p>
            </AnimatedContainer>
          ))}
        </div>
      </section>

      <section className="bg-[#FDFBF7] py-24">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 lg:px-16">
          <SectionHeading
            eyebrow={galleryHeading.eyebrow}
            title={galleryHeading.title}
            align="center"
          />
          <div className="mt-12">
            <GalleryGrid images={galleryImages} columns={2} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 lg:px-16">
        <CTASection
          title={cta.title}
          subtitle={cta.subtitle}
          buttonLabel={cta.cta.label}
          buttonTo={isExternalUrl(cta.cta.url) ? undefined : cta.cta.url}
          buttonHref={isExternalUrl(cta.cta.url) ? cta.cta.url : undefined}
        />
      </section>
    </div>
  );
}
