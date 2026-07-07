import { Link, useLocation } from "react-router-dom";
import { FOOTER_LINKS, ORDER_URL, RESERVE_URL } from "../../constants/navigation";
import { SITE, SOCIAL_LABELS } from "../../constants/site";
import { DEFAULT_PUBLIC_LOCATION_ID, getLocationConfig } from "../../config/locations";
import { useHomepageData } from "../../hooks/useHomepageData";
import { usePageContent } from "../../context/PageContentContext";
import { useLocationSelection } from "../../context/LocationContext";
import {
  resolveGoogleMapsDirectionsUrl,
} from "../../utils/locationLinks";
import { locPath } from "../../utils/locationPaths";
import {
  buildPublicSocialLinks,
  formatOpeningHoursRows,
} from "../../services/homepagePublic";
import { trackOrderClick, trackReservationClick } from "../../services/analytics";
import PhoneLinks from "../ui/PhoneLinks";
import Logo from "../ui/Logo";

const FOOTER_QUICK_LINKS = FOOTER_LINKS.slice(0, 8);
const CHEFGAA_URL = "https://www.chefgaa.com";
const CHEFGAA_LOGO_URL = "https://go.chefgaa.com/images/chefgaa-logo.webp";

/** Splits a one-line or embedded-newline address into a street line + city/state/zip line. */
function splitAddressLines(address: string): [string, string] {
  const normalized = address.replace(/\n+/g, ", ");
  const parts = normalized.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return [normalized, ""];
  return [parts[0], parts.slice(1).join(", ")];
}

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
  const { bundle } = useHomepageData();
  const { fetchSection } = usePageContent();
  const preCta = fetchSection("global", "footer_pre_cta", {
    eyebrow: "Ready to dine?",
    title: "Reserve your table or order online",
    orderCta: { label: "Order Now", url: "/online-ordering" },
    reserveCta: { label: "Reserve a Table", url: "/reservation" },
  });
  const headings = fetchSection("global", "footer_headings", {
    quickLinks: "Quick Links",
    openingHours: "Opening Hours",
    contactUs: "Contact Us",
    getDirections: "Get Directions",
  });
  const { selectedLocationId } = useLocationSelection();
  const { settings } = bundle;
  const directionsUrl = resolveGoogleMapsDirectionsUrl(settings, selectedLocationId);
  const orderPagePath = locPath(selectedLocationId, ORDER_URL);
  const reserveUrl = locPath(selectedLocationId, RESERVE_URL);
  const socialLinks = buildPublicSocialLinks(settings);
  const hoursRows = formatOpeningHoursRows(settings.opening_hours);
  const logoAlt = `${settings.restaurant_name} Indian Restaurant`;
  const hidePreCta = pathname.includes("/online-ordering") || pathname.includes("/reservation");
  const locationName = getLocationConfig(selectedLocationId ?? DEFAULT_PUBLIC_LOCATION_ID).shortName;
  const footerTagline = `Authentic Indian flavors, sizzling biryanis, mandi, kebabs, and traditional favorites served fresh every day in the heart of ${locationName}.`;
  const [addressLine1, addressLine2] = splitAddressLines(settings.address);

  return (
    <footer className="border-t border-cocoa/8 bg-[#FDFBF7]">
      {/* Pre-footer CTA strip — omitted on Order/Reservation pages, which already have their own order/reserve CTAs. */}
      {!hidePreCta && (
        <div className="border-b border-cocoa/6 bg-cocoa">
          <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-5 px-6 py-[52px] md:flex-row md:px-10 lg:px-16">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-saffron">
                {preCta.eyebrow}
              </p>
              <p className="mt-1 font-serif text-[clamp(1.1rem,2.5vw,1.5rem)] text-ivory">
                {preCta.title}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to={orderPagePath}
                onClick={() => trackOrderClick(pathname, selectedLocationId)}
                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-full bg-brand-primary px-6 text-[11px] font-bold uppercase tracking-[0.14em] text-ivory shadow-[0_4px_16px_-4px_rgba(237,60,24,0.5)] transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[3px] hover:shadow-[0_8px_24px_-6px_rgba(237,60,24,0.55)] focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-cocoa"
              >
                {preCta.orderCta.label}
              </Link>
              <Link
                to={reserveUrl}
                onClick={() => trackReservationClick(pathname, selectedLocationId)}
                className="inline-flex h-[42px] items-center justify-center gap-2 rounded-full border-2 border-ivory/30 px-6 text-[11px] font-bold uppercase tracking-[0.14em] text-ivory transition-all duration-[400ms] ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[3px] hover:border-ivory/60 hover:bg-ivory/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 focus-visible:ring-offset-cocoa"
              >
                {preCta.reserveCta.label}
              </Link>
            </div>
          </div>
        </div>
      )}
      {/* Main footer body */}
      <div className="mx-auto max-w-[1400px] px-6 py-12 md:px-10 lg:px-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Brand */}
          <div className="flex flex-col">
            <Link
              to="/"
              className="mb-5 inline-block focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2"
              aria-label="Desi Dhamaka home"
            >
              <Logo size="footer" background="ivory" src={settings.logo} alt={logoAlt} />
            </Link>
            <p className="text-[13px] leading-relaxed text-cocoa/55">{footerTagline}</p>

            <div className="mt-6 flex gap-2.5" aria-label="Social media">
              {Object.entries(socialLinks)
                .filter(([name]) => name !== "google")
                .map(([name, url]) => (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-cocoa/10 text-cocoa/45 transition-all duration-300 hover:-translate-y-0.5 hover:border-saffron/50 hover:bg-saffron/8 hover:text-saffron hover:shadow-[0_6px_16px_-8px_rgba(237,60,24,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
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
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-saffron">
              {headings.quickLinks}
            </h3>
            <ul className="space-y-1.5">
              {FOOTER_QUICK_LINKS.map((link) => (
                <li key={link.path}>
                  <Link
                    to={locPath(selectedLocationId, link.path)}
                    className="group inline-flex items-center gap-2.5 text-[14px] text-cocoa/65 transition-colors duration-300 hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                  >
                    <span className="block h-px w-3 bg-cocoa/20 transition-all duration-300 group-hover:w-4 group-hover:bg-saffron" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Opening Hours */}
          <div>
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-saffron">
              {headings.openingHours}
            </h3>
            <ul className="space-y-2.5">
              {hoursRows.map((row) => (
                <li
                  key={row.days}
                  className="grid grid-cols-[5.75rem_1fr] items-baseline gap-x-4 text-[14px] leading-snug text-cocoa/65"
                >
                  <span className="font-medium text-cocoa/70">{row.days}</span>
                  <span className="text-cocoa/55">{row.time}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-[10px] font-bold uppercase tracking-[0.28em] text-saffron">
              {headings.contactUs}
            </h3>
            <address className="not-italic space-y-3 text-[14px] leading-relaxed text-cocoa/65">
              <p className="flex items-start gap-2.5">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className="mt-0.5 shrink-0 text-saffron"
                >
                  <path
                    d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <span>
                  {addressLine1}
                  {addressLine2 && (
                    <>
                      <br />
                      {addressLine2}
                    </>
                  )}
                </span>
              </p>
              <p className="flex items-center gap-2.5">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className="shrink-0 text-saffron"
                >
                  <path
                    d="M6.5 4h3l1.5 4-2 1.5c1 2.5 2.8 4.3 5.3 5.3L16 13l4 1.5v3c0 .8-.7 1.5-1.5 1.5C9.8 19 5 14.2 5 7.5 5 6.7 5.7 6 6.5 6V4z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
                <PhoneLinks
                  phones={settings.phones}
                  linkClassName="text-[14px] text-cocoa/65 transition-colors duration-300 hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
                />
              </p>
            </address>

            <div className="mt-6">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-full border border-cocoa/15 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-cocoa/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-saffron/50 hover:bg-saffron/5 hover:text-saffron hover:shadow-[0_8px_20px_-12px_rgba(237,60,24,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                {headings.getDirections ?? "Get Directions"}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-0.5"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-cocoa/6 pt-6">
          <div className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
            <p className="text-[12px] text-cocoa/45">
              © {year} Desi Dhamaka Indian Restaurant. All Rights Reserved.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 md:justify-end">
              <Link
                to={locPath(selectedLocationId, "/privacy-policy")}
                className="text-[12px] text-cocoa/45 transition-colors duration-300 hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                Privacy Policy
              </Link>
              <Link
                to={locPath(selectedLocationId, "/terms-conditions")}
                className="text-[12px] text-cocoa/45 transition-colors duration-300 hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                Terms &amp; Conditions
              </Link>
              <a
                href={CHEFGAA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] text-cocoa/45 transition-colors duration-300 hover:text-saffron focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron"
              >
                Powered by
                <img
                  src={CHEFGAA_LOGO_URL}
                  alt="ChefGaa"
                  className="h-4 w-auto"
                  loading="lazy"
                  decoding="async"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
