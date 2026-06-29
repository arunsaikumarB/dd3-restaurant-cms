import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  NAV_LINKS,
  NAV_BAR_HEIGHT,
  ORDER_URL,
  RESERVE_URL,
  TRANSPARENT_NAV_ROUTES,
} from "../../constants/navigation";
import Button from "../ui/Button";
import Logo from "../ui/Logo";
import { EASE_POWER3 } from "../showcase/motion";

export default function Navbar() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const canBeTransparent = TRANSPARENT_NAV_ROUTES.includes(pathname);
  const isTransparent = canBeTransparent && !scrolled;
  const light = isTransparent;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
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
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <>
      <header
        className={
          "fixed left-0 right-0 top-0 z-50 transition-[background,border-color] duration-300 " +
          (isTransparent
            ? "border-transparent bg-transparent"
            : "border-b border-cocoa/10 bg-ivory")
        }
        style={{ ["--nav-height" as string]: `${NAV_BAR_HEIGHT}px` }}
      >
        <div
          className="mx-auto flex max-w-[1400px] items-center justify-between px-6 md:px-10 lg:px-16"
          style={{ height: NAV_BAR_HEIGHT }}
        >
          <Link
            to="/"
            className="group shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2"
            aria-label="Desi Dhamaka home"
          >
            <Logo size="navbar" background={light ? "dark" : "ivory"} priority hoverable />
          </Link>

          <nav
            className="hidden flex-1 items-center justify-center gap-5 md:flex lg:gap-7 xl:gap-9"
            aria-label="Primary"
          >
            {NAV_LINKS.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={
                    "relative pb-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 " +
                    (active
                      ? "text-saffron"
                      : light
                        ? "text-white/80 hover:text-white"
                        : "text-cocoa/65 hover:text-cocoa")
                  }
                >
                  {link.label}
                  <span
                    className={
                      "absolute -bottom-1 left-0 h-px bg-saffron transition-all duration-400 " +
                      (active ? "w-full" : "w-0 group-hover:w-full")
                    }
                  />
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Button to={ORDER_URL} variant="primary" className="!h-[40px] !px-5 !text-[10.5px]">
              Order Now
            </Button>
            <Button to={RESERVE_URL} variant="outline" light={light} className="!h-[40px] !px-5 !text-[10.5px]">
              Reserve a Table
            </Button>
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            className={
              "relative z-50 flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron md:hidden " +
              (light
                ? "border-white/40 text-white hover:border-white"
                : "border-cocoa/15 text-cocoa hover:border-cocoa/30")
            }
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <div className="flex w-5 flex-col gap-1.5">
              <span
                className={
                  "block h-0.5 w-full transition-transform duration-300 " +
                  (mobileOpen ? "translate-y-2 rotate-45 bg-cocoa" : light ? "bg-white" : "bg-cocoa")
                }
              />
              <span
                className={
                  "block h-0.5 w-full transition-opacity duration-300 " +
                  (mobileOpen ? "opacity-0" : light ? "bg-white" : "bg-cocoa")
                }
              />
              <span
                className={
                  "block h-0.5 w-full transition-transform duration-300 " +
                  (mobileOpen ? "-translate-y-2 -rotate-45 bg-cocoa" : light ? "bg-white" : "bg-cocoa")
                }
              />
            </div>
          </button>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            ref={drawerRef}
            id="mobile-nav-drawer"
            className="fixed inset-0 z-40 bg-ivory md:hidden"
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.45, ease: EASE_POWER3 }}
          >
            <nav
              className="flex h-full flex-col justify-center px-10 pt-20"
              aria-label="Mobile"
            >
              {NAV_LINKS.map((link, i) => {
                const active = isActive(link.path);
                return (
                  <motion.div
                    key={link.path}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + i * 0.05, ease: EASE_POWER3 }}
                  >
                    <Link
                      to={link.path}
                      className={
                        "block py-4 text-2xl font-serif transition-colors " +
                        (active ? "text-saffron" : "text-cocoa hover:text-saffron")
                      }
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                );
              })}
              <div className="mt-10 flex flex-col gap-3">
                <Button to={ORDER_URL} variant="primary">
                  Order Now
                </Button>
                <Button to={RESERVE_URL} variant="outline">
                  Reserve a Table
                </Button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
