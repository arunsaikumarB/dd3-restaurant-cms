import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import {
  NAV_BAR_HEIGHT,
  NAV_LINKS,
  ORDER_URL,
  RESERVE_URL,
  TRANSPARENT_NAV_ROUTES,
} from "../../constants/navigation";
import { LOGO, logoSrcForBackground } from "../../constants/logo";
import { useHomepageData } from "../../hooks/useHomepageData";
import { usePageContent } from "../../context/PageContentContext";
import { EASE_POWER3 } from "../showcase/motion";
import LocationSwitcher from "../location/LocationSwitcher";
import { useLocationSelection } from "../../context/LocationContext";
import { locPath } from "../../utils/locationPaths";
import { trackOrderClick, trackReservationClick } from "../../services/analytics";
import {
  isDirectOrderingMode,
  redirectToChefGaaOrder,
  useLocationOrderUrl,
  useMenuExperience,
} from "../../demo/menuExperience";
import "./navbar.css";

type NavLinkItem = { label: string; path: string };

/** Strips the `/:locationId` prefix from a pathname, e.g. "/oak-tree/about/" -> "/about". */
function relativePath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length <= 1) return "/";
  return `/${segments.slice(1).join("/")}`;
}

export default function Navbar() {
  const { bundle } = useHomepageData();
  const { fetchSection } = usePageContent();
  const navbar = fetchSection("global", "navbar", {
    orderLabel: "Order Now",
    reserveLabel: "Reserve a Table",
  });
  const { selectedLocationId } = useLocationSelection();
  const { mode: menuExperienceMode } = useMenuExperience();
  const chefGaaOrderUrl = useLocationOrderUrl();
  const directMenuOrdering = isDirectOrderingMode(menuExperienceMode);
  const orderPagePath = locPath(selectedLocationId, ORDER_URL);
  const reserveUrl = locPath(selectedLocationId, RESERVE_URL);
  const logoAlt = `${bundle.settings.restaurant_name} home`;
  const logoSrc = bundle.settings.logo?.trim() || logoSrcForBackground("dark");
  const { pathname } = useLocation();
  const relPath = relativePath(pathname);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const canBeTransparent = TRANSPARENT_NAV_ROUTES.includes(relPath);
  const isTransparent = canBeTransparent && !scrolled;
  const headerTone: "light" | "dark" = isTransparent || scrolled ? "light" : "dark";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const drawer = drawerRef.current;
    if (!drawer) return;

    const focusable = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || focusable.length === 0) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const isActive = (path: string) =>
    path === "/" ? relPath === "/" : relPath.startsWith(path);

  const handleOrderClick = () => {
    trackOrderClick(pathname, selectedLocationId);
  };

  const handleReservationNav = () => {
    trackReservationClick(pathname, selectedLocationId);
  };

  const headerClass =
    "site-header " +
    (isTransparent ? "site-header--transparent " : "site-header--solid ") +
    (scrolled ? "site-header--scrolled" : "");

  const navLinkClass = (active: boolean) =>
    "site-header__nav-link text-[12px] font-semibold whitespace-nowrap px-0.5 uppercase tracking-wide text-white/80 hover:text-white 2xl:text-sm 2xl:tracking-wider" +
    (active ? " site-header__nav-link--active" : "");

  const handleDirectMenuNav = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    redirectToChefGaaOrder(chefGaaOrderUrl);
  };

  const renderNavLink = (link: NavLinkItem) => {
    const active = isActive(link.path);

    if (link.path === "/menu" && directMenuOrdering) {
      return (
        <a
          key={link.path}
          href={chefGaaOrderUrl}
          className={navLinkClass(active)}
          onClick={handleDirectMenuNav}
        >
          {link.label}
        </a>
      );
    }

    return (
      <Link
        key={link.path}
        to={locPath(selectedLocationId, link.path)}
        className={navLinkClass(active)}
      >
        {link.label}
      </Link>
    );
  };

  return (
    <>
      <header
        className={headerClass}
        style={{ ["--nav-height" as string]: `${NAV_BAR_HEIGHT}px` }}
      >
        <div className="site-header__bar mx-auto grid h-20 w-full max-w-[1600px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-4 sm:px-8 lg:px-12 2xl:gap-x-5">
          {/* Logo */}
          <div className="flex flex-shrink-0 items-center">
            <Link to="/" className="leading-none" aria-label={LOGO.alt}>
              <img
                src={logoSrc}
                alt={logoAlt}
                className="h-14 w-auto object-contain sm:h-[58px] lg:h-16"
                decoding="async"
                loading="eager"
                fetchPriority="high"
                draggable={false}
              />
            </Link>
          </div>

          {/* Desktop nav — all links in one row, xl+ */}
          <nav
            className="site-header__nav hidden min-w-0 items-center justify-center gap-2.5 xl:flex 2xl:gap-4"
            aria-label="Primary"
          >
            {NAV_LINKS.map(renderNavLink)}
          </nav>

          {/* Desktop actions — xl+ */}
          <div className="hidden flex-shrink-0 items-center gap-2 xl:flex 2xl:gap-3">
            <Link
              to={orderPagePath}
              onClick={handleOrderClick}
              className="whitespace-nowrap rounded-full bg-brand-primary px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#d43415] 2xl:px-5 2xl:py-2.5 2xl:text-xs"
            >
              {navbar.orderLabel}
            </Link>
            <Link
              to={reserveUrl}
              onClick={handleReservationNav}
              className="whitespace-nowrap rounded-full border border-white px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-white hover:text-cocoa 2xl:px-5 2xl:py-2.5 2xl:text-xs"
            >
              {navbar.reserveLabel}
            </Link>
            <LocationSwitcher variant="header" tone={headerTone} />
          </div>

          {/* Tablet / mobile */}
          <div className="flex flex-shrink-0 items-center justify-end gap-2 xl:hidden">
            <Link
              to={orderPagePath}
              onClick={handleOrderClick}
              className="whitespace-nowrap rounded-full bg-brand-primary px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#d43415]"
            >
              {navbar.orderLabel}
            </Link>
            <button
              ref={menuButtonRef}
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/40 text-white transition-colors hover:border-white"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-drawer"
              onClick={() => setMobileOpen((value) => !value)}
            >
              {mobileOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            ref={drawerRef}
            id="mobile-nav-drawer"
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-black px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE_POWER3 }}
          >
            <button
              type="button"
              className="absolute right-6 top-6 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-white"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
            >
              <X size={22} aria-hidden />
            </button>

            <nav className="flex w-full max-w-sm flex-col items-center gap-2" aria-label="Mobile">
              {NAV_LINKS.map((link, index) => {
                const active = isActive(link.path);
                const isDirectMenu = link.path === "/menu" && directMenuOrdering;
                return (
                  <motion.div
                    key={link.path}
                    className="w-full text-center"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 + index * 0.03, ease: EASE_POWER3 }}
                  >
                    {isDirectMenu ? (
                      <a
                        href={chefGaaOrderUrl}
                        onClick={handleDirectMenuNav}
                        className={
                          "block py-2 text-2xl font-semibold transition-colors" +
                          (active ? " text-brand-secondary" : " text-white hover:text-brand-secondary")
                        }
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        to={locPath(selectedLocationId, link.path)}
                        className={
                          "block py-2 text-2xl font-semibold transition-colors" +
                          (active ? " text-brand-secondary" : " text-white hover:text-brand-secondary")
                        }
                      >
                        {link.label}
                      </Link>
                    )}
                  </motion.div>
                );
              })}
            </nav>

            <div className="mt-4 flex w-full max-w-sm flex-col items-stretch gap-3">
              <Link
                to={orderPagePath}
                onClick={handleOrderClick}
                className="rounded-full bg-brand-primary px-5 py-3 text-center text-sm font-bold uppercase tracking-wider text-white"
              >
                {navbar.orderLabel}
              </Link>
              <Link
                to={reserveUrl}
                onClick={handleReservationNav}
                className="rounded-full border border-white px-5 py-3 text-center text-sm font-bold uppercase tracking-wider text-white"
              >
                {navbar.reserveLabel}
              </Link>
              <LocationSwitcher variant="full" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
