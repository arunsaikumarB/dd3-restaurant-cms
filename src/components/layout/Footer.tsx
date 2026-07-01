import { Link, useLocation } from "react-router-dom";
import { FOOTER_LINKS, RESERVE_URL } from "../../constants/navigation";
import { EXTERNAL_ORDER_LINK_PROPS } from "../../constants/ordering";
import { SITE, SOCIAL_LABELS } from "../../constants/site";
import { useHomepageData } from "../../hooks/useHomepageData";
import { usePageContent } from "../../context/PageContentContext";
import { useLocationSelection } from "../../context/LocationContext";
import { isExternalUrl, resolveOrderUrl, resolveReservationUrl } from "../../utils/locationLinks";
import {
  buildPublicSocialLinks,
  formatOpeningHoursRows,
} from "../../services/homepagePublic";
import { trackOrderClick, trackReservationClick } from "../../services/analytics";
import Logo from "../ui/Logo";

const SOCIAL_ICONS: Record<string, JSX.Element> = {
  instagram: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  facebook: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  ),
  twitter: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M4 4l16 16M4 20L20 4" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

export default function Footer() {
  const year = new Date().getFullYear();
  const { pathname } = useLocation();
  const { bundle, locationId: bundleLocationId } = useHomepageData();
  const { fetchSection } = usePageContent();
  const preCta = fetchSection("global", "footer_pre_cta", {
    eyebrow: "Ready to dine?",
    title: "Reserve your table or order online",
    orderCta: { label: "Order Now", url: "/order" },
    reserveCta: { label: "Reserve a Table", url: "/reservation" },
  });
  const brand = fetchSection("global", "footer_brand", {
    tagline: "Authentic Indian Restaurant",
    blurb:
      "Authentic Indian flavours crafted with tradition, premium ingredients and unforgettable hospitality — since 2018.",
  });
  const headings = fetchSection("global", "footer_headings", {
    quickLinks: "Quick Links",
    openingHours: "Opening Hours",
    contactUs: "Contact Us",
    getInTouch: "Get in Touch",
  });
  const legal = fetchSection("global", "footer_legal", {
    privacyCta: { label: "Privacy Policy", url: "/contact" },
    termsCta: { label: "Terms of Service", url: "/contact" },
  });
  const { navigateWithLocationGuard, selectedLocation, selectedLocationId } = useLocationSelection();
  const { settings } = bundle;
  const reservationLink = resolveReservationUrl(settings, selectedLocationId);
  const orderLink = resolveOrderUrl(settings, selectedLocationId, bundleLocationId);
  const socialLinks = buildPublicSocialLinks(settings);
  const hoursRows = formatOpeningHoursRows(settings.opening_hours);
  const logoAlt = `${settings.restaurant_name} Indian Restaurant`;

  return (
    <footer className="border-t border-cocoa/8 bg-[#FDFBF7]">
      {/* Pre-footer CTA strip */}
      <div className="border-b border-cocoa/6 bg-cocoa">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-5 px-6 py-8 md:flex-row md:px-10 lg:px-16">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-saffron">
              {preCta.eyebrow}
            </p>
            <p className="mt-1 font-serif text-[clamp(1.1rem,2.5vw,1.5rem)] text-ivory">
              {preCta.title}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={orderLink}
              onClick={() => trackOrderClick(pathname, selectedLocationId)}
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-full bg-brand-primary px-6 text-[11px] font-bold uppercase tracking-[0.14em] text-ivory shadow-[0_4px_16px_-4px_rgba(237,60,24,0.5)] transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[3px] hover:shadow-[0_8px_24px_-6px_rgba(237,60,24,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-cocoa"
              {...EXTERNAL_ORDER_LINK_PROPS}
            >
              {preCta.orderCta.label}
            </a>
            <Link
              to={RESERVE_URL}
              onClick={(event) => {
                trackReservationClick(pathname, selectedLocationId);
                event.preventDefault();
                if (isExternalUrl(reservationLink)) {
                  window.open(reservationLink, "_blank", "noopener,noreferrer");
                  return;
                }
                navigateWithLocationGuard(RESERVE_URL);
              }}
              className="inline-flex h-[42px] items-center justify-center gap-2 rounded-full border-2 border-ivory/30 px-6 text-[11px] font-bold uppercase tracking-[0.14em] text-ivory transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[3px] hover:border-ivory/60 hover:bg-ivory/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-cocoa"
            >
              {preCta.reserveCta.label}
            </Link>
          </div>
        </div>
      </div>

      {/* Main footer body */}
      <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-10 lg:px-16 lg:py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1.5fr] lg:gap-10 xl:gap-16">

          {/* Brand column */}
          <div className="flex flex-col">
            <Link
              to="/"
              className="mb-6 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2"
              aria-label="Desi Dhamaka home"
            >
              <Logo size="footer" background="ivory" src={settings.logo} alt={logoAlt} />
            </Link>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-saffron">
              {brand.tagline}
            </p>
            {selectedLocation && (
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cocoa/55">
                {selectedLocation.name}
              </p>
            )}
            <p className="mt-1 text-[13px] text-cocoa/50">
              {settings.address.split(",").slice(-2).join(",").trim() || settings.address}
            </p>
            <p className="mt-5 max-w-xs text-[15px] leading-[1.7] text-cocoa/60">
              {brand.blurb}
            </p>

            {/* Social icons */}
            <div className="mt-7 flex gap-2.5" aria-label="Social media">
              {Object.entries(socialLinks).map(([name, url]) => (
                <a
                  key={name}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-cocoa/10 text-cocoa/50 transition-all duration-300 hover:border-saffron/60 hover:bg-saffron/8 hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                  aria-label={SOCIAL_LABELS[name as keyof typeof SITE.social] ?? name}
                >
                  {SOCIAL_ICONS[name] ?? (
                    <span className="text-[11px] font-bold uppercase">{name[0]}</span>
                  )}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-5 text-[10px] font-bold uppercase tracking-[0.28em] text-saffron">
              {headings.quickLinks}
            </h3>
            <ul className="space-y-3">
              {FOOTER_LINKS.slice(0, 7).map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    onClick={(event) => {
                      if (link.path === "/menu") {
                        event.preventDefault();
                        navigateWithLocationGuard("/menu");
                      }
                    }}
                    className="group flex items-center gap-2 text-[14px] text-cocoa/65 transition-colors duration-300 hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                  >
                    <span className="block h-px w-3 bg-cocoa/25 transition-all duration-300 group-hover:w-5 group-hover:bg-saffron" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Opening Hours */}
          <div>
            <h3 className="mb-5 text-[10px] font-bold uppercase tracking-[0.28em] text-saffron">
              {headings.openingHours}
            </h3>
            <ul className="space-y-3">
              {hoursRows.map((row) => (
                <li
                  key={row.days}
                  className="flex items-start justify-between gap-3 text-[14px] leading-snug text-cocoa/65"
                >
                  <span className="shrink-0">{row.days}</span>
                  <span className="text-right text-cocoa/50">{row.time}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-5 text-[10px] font-bold uppercase tracking-[0.28em] text-saffron">
              {headings.contactUs}
            </h3>
            <address className="not-italic space-y-3 text-[14px] leading-relaxed text-cocoa/65">
              <p>{settings.address}</p>
              <p>
                <a
                  href={`tel:${settings.phone.replace(/\D/g, "")}`}
                  className="transition-colors duration-300 hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                >
                  {settings.phone}
                </a>
              </p>
              <p>
                <a
                  href={`mailto:${settings.email}`}
                  className="transition-colors duration-300 hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                >
                  {settings.email}
                </a>
              </p>
            </address>

            <div className="mt-7">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full border border-cocoa/15 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cocoa/70 transition-all duration-300 hover:border-saffron/50 hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                {headings.getInTouch}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-cocoa/8 pt-8 md:flex-row">
          <p className="font-serif text-[15px] tracking-wide text-cocoa/60">
            {settings.restaurant_name}
          </p>
          <p className="text-[12px] uppercase tracking-[0.18em] text-cocoa/40">
            © {year} {settings.restaurant_name}. All rights reserved.
          </p>
          <div className="flex gap-5">
            {[
              legal.privacyCta,
              legal.termsCta,
            ].map((l) => (
              <Link
                key={l.label}
                to={l.url}
                className="text-[12px] text-cocoa/40 transition-colors duration-300 hover:text-saffron"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
