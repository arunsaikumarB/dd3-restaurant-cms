import Button from "./Button";
import AnimatedContainer from "./AnimatedContainer";
import { useLocationSelection } from "../../context/LocationContext";

interface CTASectionProps {
  title: string;
  subtitle?: string;
  buttonLabel: string;
  buttonTo?: string;
  buttonHref?: string;
  dark?: boolean;
}

export default function CTASection({
  title,
  subtitle,
  buttonLabel,
  buttonTo,
  buttonHref,
  dark = true,
}: CTASectionProps) {
  const { navigateWithLocationGuard } = useLocationSelection();
  return (
    <AnimatedContainer>
      <section
        className={
          "relative overflow-hidden rounded-[32px] px-8 py-16 text-center md:px-20 md:py-20 " +
          (dark ? "bg-cocoa" : "bg-white shadow-premium")
        }
        aria-labelledby="cta-title"
      >
        {/* Background texture */}
        {dark && (
          <>
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 20% 50%, rgba(201,122,43,0.18), transparent 60%), radial-gradient(ellipse 60% 80% at 80% 80%, rgba(237,60,24,0.10), transparent 55%)",
              }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                backgroundSize: "200px",
              }}
              aria-hidden
            />
          </>
        )}
        <div className="relative z-10">
          <h2
            id="cta-title"
            className={
              "font-serif text-[clamp(1.75rem,4vw,3rem)] font-semibold leading-tight tracking-tight " +
              (dark ? "text-ivory" : "text-cocoa")
            }
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className={
                "mx-auto mt-4 max-w-xl text-[16px] leading-relaxed " +
                (dark ? "text-ivory/65" : "text-cocoa/60")
              }
            >
              {subtitle}
            </p>
          )}
          <div className="mt-9 flex justify-center">
            <Button
              to={buttonTo}
              href={buttonHref}
              onClick={(event) => {
                if (buttonTo === "/menu" || buttonTo === "/order" || buttonTo === "/reservation") {
                  event.preventDefault();
                  navigateWithLocationGuard(buttonTo);
                }
              }}
              variant={dark ? "outline" : "primary"}
              className={dark ? "!border-ivory/40 !text-ivory hover:!bg-ivory/10 hover:!border-ivory/70" : ""}
            >
              {buttonLabel}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="transition-transform duration-300 group-hover:translate-x-1" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Button>
          </div>
        </div>
      </section>
    </AnimatedContainer>
  );
}
