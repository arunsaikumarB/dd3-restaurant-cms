import PageHero from "../components/ui/PageHero";
import SectionHeading from "../components/ui/SectionHeading";
import AnimatedContainer from "../components/ui/AnimatedContainer";
import CTASection from "../components/ui/CTASection";
import GalleryGrid from "../components/ui/GalleryGrid";
import { usePageContent } from "../context/PageContentContext";
import { useGallerySection, useSectionImage } from "../hooks/useGallerySection";
import { toGalleryGridImages } from "../services/galleryPublic";
import { isExternalUrl } from "../utils/locationLinks";

const TIMELINE = [
  { year: "2018", title: "The Beginning", text: "Desi Dhamaka opens its doors with a vision to bring authentic Indian hospitality to the community." },
  { year: "2020", title: "Expanding the Kitchen", text: "Our tandoor and dum kitchen grow, introducing signature biryanis and mandi to loyal guests." },
  { year: "2023", title: "Award Recognition", text: "Recognised for excellence in flavour, service and ambience across the region." },
  { year: "2026", title: "A New Chapter", text: "Grand reopening with a refined dining experience, live counters and premium private events." },
];

const PILLARS = [
  { title: "Authenticity", text: "Whole spices, hand-ground masalas and recipes passed through generations.", icon: "🌿" },
  { title: "Quality", text: "Premium ingredients sourced with care, prepared fresh for every service.", icon: "✦" },
  { title: "Hospitality", text: "Every guest is family. Every table, an experience worth remembering.", icon: "◆" },
];

export default function AboutPage() {
  const { fetchSection } = usePageContent();
  const hero = fetchSection("about", "hero", {
    label: "About Us",
    title: "Our Story",
    subtitle: "A journey rooted in tradition, guided by passion and shaped by the flavours of India.",
  });
  const mission = fetchSection("about", "mission", {
    eyebrow: "Restaurant Story",
    title: "Where tradition meets modern hospitality",
    subtitle:
      "Desi Dhamaka was born from a simple belief — that great food brings people together. From our first service to today, every dish tells a story of heritage, family recipes and the warmth of Indian hospitality.",
  });
  const philosophy = fetchSection("about", "philosophy", {
    eyebrow: "Our Philosophy",
    title: "Crafted with intention",
    subtitle:
      "We honour time-tested techniques — dum cooking, tandoor firing and slow simmering — while embracing the precision and presentation of modern fine dining.",
    pillars: PILLARS.map(({ title, text }) => ({ title, text })),
  });
  const cuisine = fetchSection("about", "cuisine", {
    eyebrow: "Authentic Indian Cuisine",
    title: "Flavours from every region",
    subtitle:
      "From Hyderabadi dum biryani to creamy North Indian curries, Indo-Chinese favourites and Arabian mandi — our menu celebrates the diversity of the subcontinent with elegance and depth.",
  });
  const chef = fetchSection("about", "chef", {
    eyebrow: "Culinary Team",
    title: "Crafted with passion",
    subtitle:
      "Our culinary team blends classical Indian techniques with contemporary presentation — every plate a balance of aroma, texture and visual artistry.",
  });
  const timeline = fetchSection("about", "timeline", {
    eyebrow: "Timeline",
    title: "Our journey",
    subtitle: "Milestones that shaped Desi Dhamaka into the destination it is today.",
    items: TIMELINE.map(({ year, title, text }) => ({ year, title, text })),
  });
  const cta = fetchSection("about", "cta", {
    title: "Experience Desi Dhamaka",
    subtitle: "Reserve your table and taste the tradition.",
    cta: { label: "Reserve Now", url: "/reservation" },
  });

  const heroBackground = useSectionImage("about_hero", "/showcase/mandi.webp");
  const traditionImages = useGallerySection("about_tradition");
  const flavoursImages = useGallerySection("about_flavours");
  const craftedImages = useGallerySection("about_crafted");
  const journeyImages = useGallerySection("about_journey");

  const missionImage = traditionImages[0]?.image ?? "/showcase/tandoori.webp";
  const missionAlt = traditionImages[0]?.alt_text ?? "Tandoori platter at Desi Dhamaka";
  const cuisineImage = flavoursImages[0]?.image ?? "/showcase/butter-chicken.webp";
  const cuisineAlt = flavoursImages[0]?.alt_text ?? "Authentic Indian cuisine";
  const chefImage = craftedImages[0]?.image ?? "/showcase/indo-chinese.webp";
  const chefAlt = craftedImages[0]?.alt_text ?? "Chef preparing cuisine";
  const bottomGallery = toGalleryGridImages(journeyImages);

  return (
    <div className="bg-ivory">
      <PageHero
        label={hero.label}
        title={hero.title}
        subtitle={hero.subtitle}
        backgroundImage={heroBackground}
        breadcrumbItems={[
          { label: "Home", to: "/" },
          { label: "About" },
        ]}
      />

      <section className="page-content-start mx-auto max-w-[1400px] px-6 pb-24 md:px-10 lg:px-16">
        <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
          <SectionHeading
            eyebrow={mission.eyebrow}
            title={mission.title}
            subtitle={mission.subtitle}
          />
          <AnimatedContainer delay={0.1}>
            <img
              src={missionImage}
              alt={missionAlt}
              loading="lazy"
              decoding="async"
              className="aspect-[4/3] w-full rounded-[28px] object-cover shadow-premium"
            />
          </AnimatedContainer>
        </div>
      </section>

      <section className="bg-[#FDFBF7] py-24">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 lg:px-16">
          <SectionHeading
            eyebrow={philosophy.eyebrow}
            title={philosophy.title}
            subtitle={philosophy.subtitle}
            align="center"
          />
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {philosophy.pillars.map((item, i) => (
              <AnimatedContainer
                key={item.title}
                delay={i * 0.08}
                className="group rounded-[24px] bg-ivory p-8 shadow-[0_8px_32px_-12px_rgba(43,29,24,0.12)] transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_20px_48px_-16px_rgba(43,29,24,0.18)]"
              >
                <span className="mb-4 block text-2xl text-saffron" aria-hidden>
                  {PILLARS[i]?.icon ?? "✦"}
                </span>
                <h3 className="font-serif text-[1.5rem] text-cocoa">{item.title}</h3>
                <p className="mt-3 text-[15px] leading-[1.7] text-cocoa/58">{item.text}</p>
              </AnimatedContainer>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 lg:px-16">
        <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
          <AnimatedContainer>
            <img
              src={cuisineImage}
              alt={cuisineAlt}
              loading="lazy"
              decoding="async"
              className="aspect-[4/3] w-full rounded-[28px] object-cover shadow-premium"
            />
          </AnimatedContainer>
          <SectionHeading
            eyebrow={cuisine.eyebrow}
            title={cuisine.title}
            subtitle={cuisine.subtitle}
          />
        </div>
      </section>

      <section className="bg-cocoa py-24 text-ivory">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 lg:px-16">
          <div className="grid items-center gap-16 lg:grid-cols-2 lg:gap-24">
            <SectionHeading
              eyebrow={chef.eyebrow}
              title={chef.title}
              subtitle={chef.subtitle}
              dark
            />
            <AnimatedContainer delay={0.1}>
              <img
                src={chefImage}
                alt={chefAlt}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full rounded-[28px] object-cover shadow-[0_40px_80px_-24px_rgba(0,0,0,0.6)]"
              />
            </AnimatedContainer>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 lg:px-16">
        <SectionHeading
          eyebrow={timeline.eyebrow}
          title={timeline.title}
          subtitle={timeline.subtitle}
          align="center"
        />
        <div className="mx-auto mt-16 max-w-3xl">
          {timeline.items.map((item, i) => (
            <AnimatedContainer key={item.year} delay={i * 0.06}>
              <div className="relative border-l-2 border-saffron/25 py-8 pl-10 last:pb-0">
                <span className="absolute -left-[9px] top-10 flex h-4 w-4 items-center justify-center rounded-full bg-saffron ring-4 ring-ivory" />
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-saffron">
                  {item.year}
                </p>
                <h3 className="mt-2 font-serif text-[1.5rem] text-cocoa">{item.title}</h3>
                <p className="mt-2 text-[15px] leading-[1.7] text-cocoa/58">{item.text}</p>
              </div>
            </AnimatedContainer>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-24 md:px-10 lg:px-16">
        <GalleryGrid images={bottomGallery} />
        <div className="mt-16">
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
