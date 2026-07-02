import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { EASE_POWER3 } from "../showcase/motion";
import "./page-hero.css";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface PageHeroProps {
  title: string;
  subtitle?: string;
  label?: string;
  /** @deprecated use backgroundImage */
  image?: string;
  backgroundImage?: string;
  backgroundVideo?: string;
  showBreadcrumb?: boolean;
  breadcrumbItems?: BreadcrumbItem[];
  overlayOpacity?: number;
  /** Custom height class override — default uses compact editorial sizing */
  height?: string;
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: EASE_POWER3, delay },
});

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function PageHero({
  title,
  subtitle,
  label = "Desi Dhamaka",
  image,
  backgroundImage,
  backgroundVideo,
  showBreadcrumb = true,
  breadcrumbItems,
  overlayOpacity = 0.45,
  height,
}: PageHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [usePoster, setUsePoster] = useState(!backgroundVideo);
  const mediaSrc = backgroundImage ?? image ?? "/showcase/biryani.webp";

  const crumbs: BreadcrumbItem[] =
    breadcrumbItems ??
    (showBreadcrumb ? [{ label: "Home", to: "/" }, { label: title }] : []);

  useEffect(() => {
    if (!backgroundVideo || prefersReducedMotion()) {
      setUsePoster(true);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      video
        .play()
        .then(() => setUsePoster(false))
        .catch(() => setUsePoster(true));
    };

    video.load();

    if (video.readyState >= 1) tryPlay();
    else video.addEventListener("loadeddata", tryPlay, { once: true });

    return () => video.removeEventListener("loadeddata", tryPlay);
  }, [backgroundVideo]);

  return (
    <section
      className={`page-hero${height ? ` ${height}` : ""}`}
      aria-labelledby="page-hero-title"
    >
      <div className="page-hero__media" aria-hidden>
        {backgroundVideo && !usePoster ? (
          <video
            ref={videoRef}
            className="page-hero__video"
            src={backgroundVideo}
            poster={mediaSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="none"
          />
        ) : (
          <img
            className="page-hero__image"
            src={mediaSrc}
            alt=""
            decoding="async"
            loading="eager"
          />
        )}
        <div
          className="page-hero__overlay"
          style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})` }}
        />
      </div>

      <div className="page-hero__inner">
        {showBreadcrumb && crumbs.length > 0 && (
          <motion.nav
            className="page-hero__breadcrumb"
            aria-label="Breadcrumb"
            {...fadeUp(0)}
          >
            <ol className="page-hero__breadcrumb-list">
              {crumbs.map((crumb, index) => {
                const isLast = index === crumbs.length - 1;
                return (
                  <li key={`${crumb.label}-${index}`} className="page-hero__breadcrumb-item">
                    {index > 0 && (
                      <span className="page-hero__breadcrumb-sep" aria-hidden>
                        /
                      </span>
                    )}
                    {crumb.to && !isLast ? (
                      <Link to={crumb.to} className="page-hero__breadcrumb-link">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span
                        className="page-hero__breadcrumb-current"
                        aria-current={isLast ? "page" : undefined}
                      >
                        {crumb.label}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </motion.nav>
        )}

        <motion.p className="page-hero__label" {...fadeUp(0.1)}>
          {label}
        </motion.p>

        <motion.h1 id="page-hero-title" className="page-hero__title" {...fadeUp(0.2)}>
          {title}
        </motion.h1>

        {subtitle && (
          <motion.p className="page-hero__subtitle" {...fadeUp(0.32)}>
            {subtitle}
          </motion.p>
        )}
      </div>

      <div className="page-hero__fade" aria-hidden />
      <svg
        className="page-hero__wave"
        viewBox="0 0 1440 56"
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d="M0,32 C240,56 480,16 720,32 C960,48 1200,8 1440,28 L1440,56 L0,56 Z"
          fill="#F8F5F0"
        />
      </svg>
    </section>
  );
}
