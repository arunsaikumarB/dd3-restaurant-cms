import { useEffect, useRef, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  type Variants,
} from "framer-motion";
import { EASE_POWER3 } from "./showcase/motion";
import Logo from "./ui/Logo";

const HERO_VIDEO = "/hero/videoplayback.mp4";
const HERO_POSTER = "/hero/hero-poster.jpg";
const DEFAULT_TITLE = "Step inside\nthe experience";
const DEFAULT_SUBTITLE =
  "Scroll to walk through our doors — from the entrance to the heart of the reception, frame by cinematic frame.";

export interface HeroProps {
  title?: string;
  subtitle?: string;
  videoSrc?: string;
  posterSrc?: string;
  logoSrc?: string | null;
  logoAlt?: string;
}

function splitTitleLines(title: string): string[] {
  const lines = title
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines : [title];
}

const overlayVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 1, ease: EASE_POWER3 },
  },
};

const logoVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE_POWER3, delay: 0.15 },
  },
};

const lineVariants: Variants = {
  hidden: { opacity: 0, y: 36 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 1,
      ease: EASE_POWER3,
      delay: 0.3 + i * 0.12,
    },
  }),
};

const subVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, ease: EASE_POWER3, delay: 0.65 },
  },
};

const scrollHintVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE_POWER3, delay: 0.85 },
  },
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function Hero({
  title = DEFAULT_TITLE,
  subtitle = DEFAULT_SUBTITLE,
  videoSrc = HERO_VIDEO,
  posterSrc = HERO_POSTER,
  logoSrc = null,
  logoAlt,
}: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [usePoster, setUsePoster] = useState(false);
  const [ready, setReady] = useState(false);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const stageOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0.45]);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    if (reduced) {
      setUsePoster(true);
      setReady(true);
      return;
    }

    const video = videoRef.current;
    if (!video) {
      setReady(true);
      return;
    }

    const tryPlay = () => {
      video
        .play()
        .then(() => {
          setUsePoster(false);
          setReady(true);
        })
        .catch(() => {
          setUsePoster(true);
          setReady(true);
        });
    };

    video.load();

    if (video.readyState >= 1) {
      tryPlay();
    } else {
      video.addEventListener("loadeddata", tryPlay, { once: true });
    }

    return () => {
      video.removeEventListener("loadeddata", tryPlay);
    };
  }, [videoSrc]);

  const titleLines = splitTitleLines(title);

  return (
    <section ref={sectionRef} className="hero">
      {!usePoster ? (
        <video
          ref={videoRef}
          className="hero__video"
          src={videoSrc}
          poster={posterSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          aria-hidden
        />
      ) : (
        <img
          className="hero__video hero__poster"
          src={posterSrc}
          alt=""
          aria-hidden
          decoding="async"
        />
      )}

      <motion.div className="hero__stage" style={{ opacity: stageOpacity }}>
        <motion.div
          className="hero__overlay"
          variants={overlayVariants}
          initial="hidden"
          animate={ready ? "visible" : "hidden"}
        />

        <div className="hero__content">
          <motion.div
            className="hero__logo-wrap"
            variants={logoVariants}
            initial="hidden"
            animate={ready ? "visible" : "hidden"}
          >
            <Logo size="hero" background="dark" priority src={logoSrc} alt={logoAlt} />
          </motion.div>

          <h1 className="hero__title">
            {titleLines.map((line, i) => (
              <motion.span
                key={line}
                className="hero__title-line"
                custom={i}
                variants={lineVariants}
                initial="hidden"
                animate={ready ? "visible" : "hidden"}
              >
                {line}
                {i < titleLines.length - 1 && <br />}
              </motion.span>
            ))}
          </h1>

          <motion.p
            className="hero__sub"
            variants={subVariants}
            initial="hidden"
            animate={ready ? "visible" : "hidden"}
          >
            {subtitle}
          </motion.p>
        </div>

        <motion.div
          className="scroll-hint"
          variants={scrollHintVariants}
          initial="hidden"
          animate={ready ? "visible" : "hidden"}
          aria-label="Scroll down to explore"
        >
          <span className="scroll-hint__mouse" aria-hidden />
          Scroll
        </motion.div>
      </motion.div>
    </section>
  );
}
