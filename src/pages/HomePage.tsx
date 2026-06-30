import { lazy, Suspense } from "react";
import Hero from "../components/Hero";
import LazyMount from "../components/ui/LazyMount";
import SectionPlaceholder from "../components/ui/SectionPlaceholder";
import { useHomepageData } from "../hooks/useHomepageData";
import { formatWeekdayHoursLabel } from "../services/homepagePublic";
import { useLocationSelection } from "../context/LocationContext";
import { resolveOrderUrl } from "../utils/locationLinks";
import "../App.css";

const EntranceImageSequence = lazy(
  () => import("../components/home/EntranceImageSequence"),
);
const ExperienceCards = lazy(
  () => import("../components/experience/ExperienceCards"),
);
const SignatureCarousel = lazy(
  () => import("../components/signature/SignatureCarousel"),
);
const AboutSection = lazy(() => import("../components/about/AboutSection"));
const CateringImageSequence = lazy(
  () => import("../components/catering-sequence/CateringImageSequence"),
);
const ExperienceSection = lazy(
  () => import("../components/atmosphere/ExperienceSection"),
);

export default function HomePage() {
  const { bundle, locationId: bundleLocationId } = useHomepageData();
  const { selectedLocationId } = useLocationSelection();
  const { content, settings } = bundle;
  const orderCtaLink = resolveOrderUrl(settings, selectedLocationId, bundleLocationId);
  const logoAlt = `${settings.restaurant_name} Indian Restaurant`;

  return (
    <div className="page">
      <Hero
        title={content.hero_title}
        subtitle={content.hero_subtitle}
        videoSrc={content.hero_video}
        posterSrc={content.hero_image}
        logoSrc={settings.logo}
        logoAlt={logoAlt}
      />

      <LazyMount
        dark
        minHeight="100vh"
        placeholderLabel="Preparing entrance experience"
      >
        <Suspense
          fallback={
            <SectionPlaceholder
              dark
              minHeight="100vh"
              label="Loading entrance animation"
            />
          }
        >
          <EntranceImageSequence />
        </Suspense>
      </LazyMount>

      <div
        aria-hidden
        className="h-[8vh] min-h-[48px] w-full"
        style={{
          background: "linear-gradient(180deg, #050505 0%, #0c0a09 100%)",
        }}
      />

      <LazyMount
        dark
        minHeight="80vh"
        placeholderLabel="Loading experience cards"
      >
        <Suspense fallback={<SectionPlaceholder dark minHeight="80vh" />}>
          <ExperienceCards
            restaurantName={settings.restaurant_name}
            hoursLabel={formatWeekdayHoursLabel(settings.opening_hours)}
            phone={settings.phone}
            email={settings.email}
            address={settings.address}
            facebook={settings.facebook}
            instagram={settings.instagram}
            youtube={settings.youtube}
            mapsUrl={settings.google_maps}
            orderCtaText={content.cta_text}
            orderCtaLink={orderCtaLink}
          />
        </Suspense>
      </LazyMount>

      <LazyMount
        dark
        minHeight="70vh"
        placeholderLabel="Loading signature dishes"
      >
        <Suspense fallback={<SectionPlaceholder dark minHeight="70vh" />}>
          <SignatureCarousel />
        </Suspense>
      </LazyMount>

      <LazyMount
        minHeight="520px"
        placeholderLabel="Loading our story"
      >
        <Suspense fallback={<SectionPlaceholder minHeight="520px" />}>
          <AboutSection
            title={content.about_title}
            description={content.about_description}
          />
        </Suspense>
      </LazyMount>

      <LazyMount
        dark
        minHeight="100vh"
        placeholderLabel="Preparing catering experience"
      >
        <Suspense
          fallback={
            <SectionPlaceholder
              dark
              minHeight="100vh"
              label="Loading catering animation"
            />
          }
        >
          <CateringImageSequence />
        </Suspense>
      </LazyMount>

      <LazyMount
        minHeight="60vh"
        placeholderLabel="Loading gallery"
      >
        <Suspense fallback={<SectionPlaceholder minHeight="60vh" />}>
          <ExperienceSection restaurantName={settings.restaurant_name} />
        </Suspense>
      </LazyMount>
    </div>
  );
}
