import { lazy, Suspense } from "react";
import Hero from "../components/Hero";
import LazyMount from "../components/ui/LazyMount";
import SectionPlaceholder from "../components/ui/SectionPlaceholder";
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
  return (
    <div className="page">
      <Hero />

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
          <ExperienceCards />
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
          <AboutSection />
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
          <ExperienceSection />
        </Suspense>
      </LazyMount>
    </div>
  );
}
