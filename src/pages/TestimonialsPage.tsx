import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PageHero from "../components/ui/PageHero";
import SectionHeading from "../components/ui/SectionHeading";
import AnimatedContainer from "../components/ui/AnimatedContainer";
import CTASection from "../components/ui/CTASection";
import { EASE_POWER3, prefersReducedMotion } from "../components/showcase/motion";

const TESTIMONIALS = [
  {
    name: "Priya Sharma",
    text: "The biryani here is unlike anything else in the city. Aromatic, perfectly spiced and served with genuine warmth. Desi Dhamaka has become our family's favourite.",
    rating: 5,
    source: "Google Review",
  },
  {
    name: "James Mitchell",
    text: "We hosted our anniversary dinner in the private room — impeccable service, stunning presentation and flavours that transported us. Truly a premium experience.",
    rating: 5,
    source: "Google Review",
  },
  {
    name: "Aisha Khan",
    text: "From the mandi to the falooda, every dish exceeded expectations. The attention to detail and hospitality makes this a standout Indian restaurant.",
    rating: 5,
    source: "Google Review",
  },
  {
    name: "Robert Chen",
    text: "Catered our corporate event for 120 guests. Live tandoor counter was a hit. Professional team, on-time setup and restaurant-quality food at scale.",
    rating: 5,
    source: "Google Review",
  },
];

function AnimatedRating({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1400;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Number((value * progress).toFixed(1)));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return (
    <span className="font-serif text-[clamp(3.5rem,9vw,5.5rem)] font-semibold leading-none text-saffron">
      {display.toFixed(1)}
    </span>
  );
}

export default function TestimonialsPage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="bg-ivory">
      <PageHero
        label="Guest Reviews"
        title="Testimonials"
        subtitle="Stories from guests who have experienced the warmth, flavour and hospitality of Desi Dhamaka."
        backgroundImage="/showcase/butter-chicken.jpg"
        breadcrumbItems={[
          { label: "Home", to: "/" },
          { label: "Testimonials" },
        ]}
      />

      {/* Featured review + rating */}
      <section className="page-content-start mx-auto max-w-[1400px] px-6 pb-24 md:px-10 lg:px-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_2.5fr] lg:gap-20">
          <AnimatedContainer>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-saffron">
              Average Rating
            </p>
            <div className="mt-3 flex items-end gap-2">
              <AnimatedRating value={4.9} />
              <span className="mb-2 font-serif text-[1.5rem] text-cocoa/30">/5</span>
            </div>
            <div className="mt-2 flex gap-0.5 text-[1.2rem] text-saffron" aria-label="4.9 out of 5 stars">
              {"★★★★★"}
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-cocoa/55">
              Based on 500+ Google Reviews
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-saffron/10 px-4 py-2">
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden fill="currentColor" className="text-saffron">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-saffron">Google Verified</span>
            </div>
          </AnimatedContainer>

          <div
            className="relative"
            aria-live="polite"
            aria-atomic="true"
          >
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: EASE_POWER3 }}
                className="rounded-[28px] bg-[#FDFBF7] p-8 shadow-[0_24px_64px_-24px_rgba(43,29,24,0.18)] md:p-12"
              >
                <p className="font-serif text-[clamp(1.2rem,2.5vw,1.65rem)] leading-[1.6] text-cocoa">
                  &ldquo;{TESTIMONIALS[index].text}&rdquo;
                </p>
                <footer className="mt-8 flex items-center justify-between gap-4 border-t border-cocoa/8 pt-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-saffron/12 font-serif text-lg font-semibold text-saffron">
                      {TESTIMONIALS[index].name[0]}
                    </div>
                    <div>
                      <cite className="not-italic block font-semibold text-cocoa">
                        {TESTIMONIALS[index].name}
                      </cite>
                      <p className="text-[12px] text-cocoa/45">{TESTIMONIALS[index].source}</p>
                    </div>
                  </div>
                  <span className="text-[1.1rem] tracking-wide text-saffron" aria-label={`${TESTIMONIALS[index].rating} stars`}>
                    {"★".repeat(TESTIMONIALS[index].rating)}
                  </span>
                </footer>
              </motion.blockquote>
            </AnimatePresence>

            <div className="mt-6 flex items-center gap-2.5">
              {TESTIMONIALS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to review ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={
                    "h-1.5 rounded-full transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron " +
                    (i === index ? "w-10 bg-saffron" : "w-1.5 bg-cocoa/15 hover:bg-cocoa/35")
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* All reviews grid */}
      <section className="bg-[#FDFBF7] py-24">
        <div className="mx-auto max-w-[1400px] px-6 md:px-10 lg:px-16">
          <SectionHeading
            eyebrow="All Reviews"
            title="What our guests say"
            align="center"
          />
          <div className="mt-14 grid gap-5 md:grid-cols-2">
            {TESTIMONIALS.map((item, i) => (
              <AnimatedContainer
                key={item.name}
                delay={i * 0.07}
                className="group rounded-[24px] bg-ivory p-7 shadow-[0_8px_32px_-12px_rgba(43,29,24,0.12)] transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:shadow-[0_24px_56px_-18px_rgba(43,29,24,0.18)]"
              >
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-saffron/12 font-serif text-lg font-semibold text-saffron">
                    {item.name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-cocoa">{item.name}</p>
                    <p className="text-[12px] text-cocoa/45">{item.source}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-[0.95rem] text-saffron" aria-label={`${item.rating} stars`}>
                    {"★".repeat(item.rating)}
                  </span>
                </div>
                <span className="mb-4 block h-px w-8 rounded-full bg-saffron/30 transition-all duration-300 group-hover:w-16 group-hover:bg-saffron/50" aria-hidden />
                <p className="text-[14.5px] leading-[1.75] text-cocoa/62">
                  {item.text}
                </p>
              </AnimatedContainer>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-[1400px] px-6 py-24 md:px-10 lg:px-16">
        <CTASection
          title="Join Our Community of Happy Guests"
          subtitle="Reserve your table and create your own memorable experience."
          buttonLabel="Reserve Now"
          buttonTo="/reservation"
        />
      </section>
    </div>
  );
}
