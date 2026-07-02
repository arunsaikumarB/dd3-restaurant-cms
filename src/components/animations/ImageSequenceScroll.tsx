import { useMemo, useRef, useState } from "react";
import BaseImageSequenceScroll from "../ImageSequenceScroll";
import "./image-sequence-scroll.css";

/**
 * Apple / Awwwards-style cinematic, scroll-driven frame sequence.
 *
 * A thin, reusable presentation layer on top of the canvas engine in
 * `../ImageSequenceScroll` (preload → requestAnimationFrame → GSAP ScrollTrigger
 * pin + scrub). This wrapper adds the dark cinematic scrim, vignette, luxury
 * typographic overlay and scroll hint, plus responsive tuning.
 *
 * Frames are pre-extracted from the source video with `scripts/extract-frames.mjs`
 * (generate once, cache, reuse) — the video is never played at runtime.
 */
export interface ImageSequenceScrollProps {
  /** Ordered, pre-extracted frame URLs (from the generated manifest). */
  frames: string[];
  /** Total frame count metadata (defaults to `frames.length`). */
  frameCount?: number;
  /** Native frame width — defines the aspect ratio (default 1280). */
  width?: number;
  /** Native frame height — defines the aspect ratio (default 720). */
  height?: number;
  /** Scroll length of the pinned section, in viewport heights (default 3). */
  scrollLength?: number;
  /** Dark cinematic overlay opacity, 0–1 (default 0.45). */
  overlay?: number;
  /** Small eyebrow above the heading, e.g. "DESI DHAMAKA". */
  eyebrow?: string;
  /** Serif heading, line 1 (e.g. "Step Inside"). */
  title?: string;
  /** Serif heading, line 2 / subtitle (e.g. "Our South Plainfield Experience"). */
  subtitle?: string;
  /** Supporting paragraph. */
  body?: string;
  /** Bottom scroll hint label (e.g. "Scroll to Explore"). */
  scrollHint?: string;
  /** Fraction of scroll the overlay stays fully visible before fading (default 0.15). */
  overlayHold?: number;
  /** Source video path — provenance only; not played at runtime. */
  videoSrc?: string;
  className?: string;
}

type Viewport = "desktop" | "tablet" | "mobile";

function currentViewport(): Viewport {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export default function ImageSequenceScroll({
  frames,
  frameCount,
  width = 1280,
  height = 720,
  scrollLength = 3,
  overlay = 0.45,
  eyebrow,
  title,
  subtitle,
  body,
  scrollHint,
  overlayHold = 0.15,
  videoSrc,
  className,
}: ImageSequenceScrollProps) {
  // Resolve responsive behaviour once at mount (avoids reloading frames on
  // resize; the canvas engine handles its own DPR-aware resize).
  const [viewport] = useState<Viewport>(currentViewport);

  const overlayRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Mobile plays a lighter frame subset for smoother playback + lower memory.
  const effectiveFrames = useMemo(() => {
    if (viewport === "mobile" && frames.length > 8) {
      const subset = frames.filter((_, i) => i % 2 === 0);
      const last = frames[frames.length - 1];
      if (subset[subset.length - 1] !== last) subset.push(last);
      return subset;
    }
    return frames;
  }, [frames, viewport]);

  // Tablet: reduced scroll distance. Mobile: shorter still.
  const effectiveScroll =
    viewport === "mobile"
      ? scrollLength * 0.6
      : viewport === "tablet"
        ? scrollLength * 0.8
        : scrollLength;

  const handleProgress = (p: number) => {
    // Fully visible through the first `overlayHold`, then fade out while the
    // camera begins moving — the footage stays the hero.
    const fadeRange = 0.28;
    const opacity = p <= overlayHold ? 1 : clamp01(1 - (p - overlayHold) / fadeRange);
    const translateY = (1 - opacity) * -48;
    if (overlayRef.current) {
      overlayRef.current.style.opacity = String(opacity);
      overlayRef.current.style.transform = `translateY(${translateY}px)`;
    }
    if (progressRef.current) {
      progressRef.current.style.transform = `scaleX(${p})`;
    }
  };

  const total = frameCount ?? effectiveFrames.length;
  const hasOverlayContent = Boolean(
    eyebrow || title || subtitle || body || scrollHint,
  );

  return (
    <BaseImageSequenceScroll
      frames={effectiveFrames}
      frameCount={effectiveFrames.length}
      width={width}
      height={height}
      scrollDuration={effectiveScroll}
      scrub={0.6}
      fit="cover"
      background="#050505"
      posterSrc={frames[0]}
      className={`iss-cinematic${className ? ` ${className}` : ""}`}
      onProgress={hasOverlayContent ? handleProgress : undefined}
    >
      {hasOverlayContent ? (
        <>
          <div className="iss-scrim" aria-hidden style={{ opacity: overlay }} />
          <div className="iss-vignette" aria-hidden />

          <div
            className="iss-overlay"
            ref={overlayRef}
            data-source={videoSrc}
            data-frames={total}
          >
            <div className="iss-overlay__inner">
              {eyebrow ? (
                <p className="iss-overlay__eyebrow">{eyebrow}</p>
              ) : null}
              {title || subtitle ? (
                <h2 className="iss-overlay__heading">
                  {title ? (
                    <span className="iss-overlay__title">{title}</span>
                  ) : null}
                  {subtitle ? (
                    <span className="iss-overlay__subtitle">{subtitle}</span>
                  ) : null}
                </h2>
              ) : null}
              {body ? <p className="iss-overlay__body">{body}</p> : null}
            </div>

            {scrollHint ? (
              <div className="iss-overlay__hint">
                <span className="iss-overlay__hint-arrow" aria-hidden>
                  &#8595;
                </span>
                <span className="iss-overlay__hint-label">{scrollHint}</span>
              </div>
            ) : null}
          </div>

          <div className="iss-progress" aria-hidden>
            <div className="iss-progress__bar" ref={progressRef} />
          </div>
        </>
      ) : null}
    </BaseImageSequenceScroll>
  );
}
