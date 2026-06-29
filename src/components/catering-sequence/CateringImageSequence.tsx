import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import ImageSequenceScroll from "../ImageSequenceScroll";
import SectionPlaceholder from "../ui/SectionPlaceholder";
import { fetchFrameManifest, type FrameManifest } from "../../utils/frameManifest";
import {
  CATERING_MANIFEST_URL,
  CATERING_OVERLAY,
  CATERING_SCROLL_DURATION,
} from "../../data/cateringSequence";
import "./catering-sequence.css";

export default function CateringImageSequence() {
  const [manifest, setManifest] = useState<FrameManifest | null>(null);
  const [error, setError] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    fetchFrameManifest(CATERING_MANIFEST_URL)
      .then((data) => {
        if (!cancelled) setManifest(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // All frame-driven updates happen here, outside the React render cycle.
  const handleProgress = (p: number) => {
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${p})`;
    }
    if (overlayRef.current) {
      const fadeStart = 0.72;
      const opacity =
        p >= fadeStart ? Math.max(0, 1 - (p - fadeStart) / (1 - fadeStart)) : 1;
      const translateY = p >= fadeStart ? (p - fadeStart) * -48 : 0;
      overlayRef.current.style.opacity = String(opacity);
      overlayRef.current.style.transform = `translateY(${translateY}px)`;
    }
  };

  if (error) {
    return (
      <section className="catering-sequence-error">
        <p>
          Catering frames not found. Run <code>npm run extract:catering</code> to
          generate the image sequence, then reload.
        </p>
      </section>
    );
  }

  if (!manifest) {
    return (
      <SectionPlaceholder
        dark
        minHeight="100vh"
        label="Loading catering experience"
      />
    );
  }

  return (
    <ImageSequenceScroll
      frames={manifest.frames}
      frameCount={manifest.frameCount}
      width={manifest.width}
      height={manifest.height}
      scrollDuration={CATERING_SCROLL_DURATION}
      scrub={0.6}
      fit="cover"
      onProgress={handleProgress}
    >
      <div className="catering-seq-overlay" aria-hidden />

      <div className="catering-seq-content" ref={overlayRef}>
        <div className="catering-seq-content__panel">
          <p className="catering-seq-content__label">{CATERING_OVERLAY.label}</p>
          <h2 className="catering-seq-content__title">{CATERING_OVERLAY.title}</h2>
          <p className="catering-seq-content__desc">
            {CATERING_OVERLAY.description}
          </p>
          <Link to={CATERING_OVERLAY.href} className="catering-seq-content__btn">
            {CATERING_OVERLAY.cta}
            <span className="catering-seq-content__btn-arrow" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          </Link>
        </div>
      </div>

      <div className="catering-sequence-progress">
        <div className="catering-sequence-progress__bar" ref={progressBarRef} />
      </div>
    </ImageSequenceScroll>
  );
}
