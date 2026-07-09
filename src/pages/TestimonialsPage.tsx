import { useEffect, useState } from "react";
import PageHero from "../components/ui/PageHero";
import SectionHeading from "../components/ui/SectionHeading";
import AnimatedContainer from "../components/ui/AnimatedContainer";
import Button from "../components/ui/Button";
import CTASection from "../components/ui/CTASection";
import { ReviewsGridSkeleton } from "../components/testimonials/TestimonialsPageSkeleton";
import { usePageContent } from "../context/PageContentContext";
import { useLocationSelection } from "../context/LocationContext";
import { getLocationConfig, resolvePublicLocationId } from "../config/locations";
import { useReviewsData } from "../hooks/useReviewsData";
import { useGoogleRatingStats } from "../hooks/useGoogleRatingStats";
import { useSectionImage } from "../hooks/useGallerySection";
import { isExternalUrl } from "../utils/locationLinks";

function AnimatedRating({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frameId = 0;
    let cancelled = false;
    const duration = 1400;
    const start = performance.now();

    const tick = (now: number) => {
      if (cancelled) return;
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Number((value * progress).toFixed(1)));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    };
  }, [value]);

  return (
    <span className="font-serif text-[clamp(2.25rem,8vw,3.5rem)] font-semibold leading-none text-saffron">
      {display.toFixed(1)}
    </span>
  );
}

export default function TestimonialsPage() {
  const { fetchSection } = usePageContent();
  const { reviews, loading } = useReviewsData();
  const googleRating = useGoogleRatingStats();
  const { selectedLocationId } = useLocationSelection();
  const heroBackground = useSectionImage("testimonials_hero", "/showcase/butter-chicken.webp");

  const location = getLocationConfig(resolvePublicLocationId(selectedLocationId));

  const hero = fetchSection("testimonials", "hero", {
    label: "Guest Reviews",
    title: "Testimonials",
    subtitle:
      "Stories from guests who have experienced the warmth, flavour and hospitality of Desi Dhamaka.",
  });
  const ratingStats = fetchSection("testimonials", "rating_stats", {
    ratingValue: "4.9",
    reviewCountText: "Based on 500+ Google Reviews",
    verifiedBadge: "Google Verified",
    reviewSourceLabel: "Google Reviews",
    viewAllLabel: "View All Google Reviews",
    leaveReviewLabel: "Leave Us a Review",
  });
  const reviewsGrid = fetchSection("testimonials", "reviews_grid", {
    eyebrow: "All Reviews",
    title: "What our guests say",
  });
  const emptyStates = fetchSection("testimonials", "empty_states", {
    gridTitle: "No reviews yet",
    gridBody: "Be the first to share your experience with us.",
  });
  const cta = fetchSection("testimonials", "cta", {
    title: "Join Our Community of Happy Guests",
    subtitle: "Reserve your table and create your own memorable experience.",
    cta: { label: "Reserve Now", url: "/reservation" },
  });
  const ratingValue = googleRating?.rating ?? (Number.parseFloat(ratingStats.ratingValue) || 4.9);
  const reviewCountText = googleRating
    ? `Based on ${googleRating.rating_count.toLocaleString()} Google Reviews`
    : ratingStats.reviewCountText;

  return (
    <div className="bg-ivory">
      <PageHero
        label={hero.label}
        title={hero.title}
        subtitle={hero.subtitle}
        backgroundImage={heroBackground}
        breadcrumbItems={[
          { label: "Home", to: "/" },
          { label: "Testimonials" },
        ]}
      />

      <section className="page-content-start bg-[#FDFBF7] py-24">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 lg:px-16">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <SectionHeading
              eyebrow={reviewsGrid.eyebrow}
              title={reviewsGrid.title}
              align="left"
            />

            <AnimatedContainer className="text-left lg:text-right">
              <div className="flex items-baseline gap-2 lg:justify-end">
                <AnimatedRating value={ratingValue} />
                <span className="font-serif text-[clamp(2.25rem,8vw,3.5rem)] leading-none text-cocoa/30">
                  /5
                </span>
              </div>
              <div
                className="mt-2 flex gap-0.5 text-[1.2rem] text-saffron lg:justify-end"
                aria-label={`${ratingValue} out of 5 stars`}
              >
                {"★★★★★"}
              </div>
              <p className="mt-4 text-[14px] leading-relaxed text-cocoa/55">
                {reviewCountText}
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-saffron/10 px-4 py-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  aria-hidden
                  fill="currentColor"
                  className="text-saffron"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-saffron">
                  {ratingStats.verifiedBadge}
                </span>
              </div>
            </AnimatedContainer>
          </div>

          {loading ? (
            <ReviewsGridSkeleton />
          ) : reviews.length === 0 ? (
            <div className="mt-14 rounded-[24px] border border-cocoa/10 bg-ivory p-12 text-center">
              <p className="font-serif text-2xl text-cocoa">{emptyStates.gridTitle}</p>
              <p className="mt-3 text-cocoa/60">{emptyStates.gridBody}</p>
            </div>
          ) : (
            <div className="mt-14 columns-1 gap-5 sm:columns-2 lg:columns-3">
              {reviews.map((item, i) => (
                <AnimatedContainer
                  key={item.id}
                  delay={Math.min(i * 0.05, 0.4)}
                  className="mb-5 inline-block w-full break-inside-avoid"
                >
                  <div className="group relative rounded-[20px] border border-cocoa/8 bg-white p-6 shadow-[0_2px_12px_-4px_rgba(43,29,24,0.08)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_20px_44px_-16px_rgba(43,29,24,0.18)]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-saffron/12 font-serif text-base font-semibold text-saffron">
                          {item.name[0]}
                        </div>
                        <div>
                          <p className="font-semibold leading-tight text-cocoa">{item.name}</p>
                          <div className="mt-0.5 flex items-center gap-1">
                            <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" aria-hidden>
                              <path
                                fill="#4285F4"
                                d="M23.52 12.27c0-.85-.07-1.66-.2-2.45H12v4.63h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.89c2.28-2.1 3.56-5.2 3.56-8.81Z"
                              />
                              <path
                                fill="#34A853"
                                d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.89-3c-1.08.73-2.46 1.15-4.06 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.1A12 12 0 0 0 12 24Z"
                              />
                              <path
                                fill="#FBBC05"
                                d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56v-3.1H1.26a12 12 0 0 0 0 10.76l4.01-3.1Z"
                              />
                              <path
                                fill="#EA4335"
                                d="M12 4.77c1.76 0 3.34.6 4.58 1.79l3.44-3.44A11.98 11.98 0 0 0 12 0 12 12 0 0 0 1.26 6.62l4.01 3.1C6.22 6.88 8.87 4.77 12 4.77Z"
                              />
                            </svg>
                            <p className="text-[11.5px] text-cocoa/45">
                              {item.source || ratingStats.reviewSourceLabel}
                            </p>
                          </div>
                        </div>
                      </div>
                      <span
                        className="shrink-0 text-[0.85rem] tracking-tight text-saffron"
                        aria-label={`${item.rating} stars`}
                      >
                        {"★".repeat(item.rating)}
                      </span>
                    </div>

                    <p className="mt-4 line-clamp-6 text-[14px] leading-[1.7] text-cocoa/68">
                      {item.text}
                    </p>
                  </div>
                </AnimatedContainer>
              ))}
            </div>
          )}

          <div className="mt-14 flex flex-wrap items-center justify-center gap-4">
            <Button
              href={`https://search.google.com/local/reviews?placeid=${location.googlePlaceId}`}
              variant="outline"
            >
              {ratingStats.viewAllLabel}
            </Button>
            <Button
              href={`https://search.google.com/local/writereview?placeid=${location.googlePlaceId}`}
              variant="primary"
            >
              {ratingStats.leaveReviewLabel}
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-24 md:px-10 lg:px-16">
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
