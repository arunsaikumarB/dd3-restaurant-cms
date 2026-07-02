import { useMemo, useState } from "react";
import BaseImageSequenceScroll from "../ImageSequenceScroll";

/**
 * Apple / Awwwards-style cinematic, scroll-driven frame sequence — FINAL.
 *
 * A thin, reusable presentation layer on top of the canvas engine in
 * `../ImageSequenceScroll` (preload → requestAnimationFrame → GSAP ScrollTrigger
 * pin + scrub). This section is intentionally clean: no overlay, no title,
 * no scrim, no CTA — the cinematic walkthrough IS the story.
 *
 * Frames are pre-extracted from the source video with `scripts/extract-frames.mjs`
 * (generate once, cache, reuse) — the video is never played at runtime.
 *
 * Future changes should only touch: the source video, the frame count, or the
 * scroll length. Layout / rendering / animation must stay unchanged.
 */
export interface ImageSequenceScrollProps {
  /** Ordered, pre-extracted frame URLs (from the generated manifest). */
  frames: string[];
  /** Source video path — provenance + no-JS fallback context; never played. */
  video?: string;
  /** Total frame count metadata (defaults to `frames.length`). */
  frameCount?: number;
  /** Scroll length of the pinned section, in viewport heights (default 3). */
  scrollLength?: number;
  /** Native frame width — defines the aspect ratio (default 1280). */
  canvasWidth?: number;
  /** Native frame height — defines the aspect ratio (default 720). */
  canvasHeight?: number;
  /** Location id this sequence belongs to (provenance / analytics hook). */
  location?: string;
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

export default function ImageSequenceScroll({
  frames,
  video,
  frameCount,
  scrollLength = 3,
  canvasWidth = 1280,
  canvasHeight = 720,
  location,
  className,
}: ImageSequenceScrollProps) {
  // Resolve responsive behaviour once at mount (avoids reloading frames on
  // resize; the canvas engine handles its own DPR-aware resize).
  const [viewport] = useState<Viewport>(currentViewport);

  // Mobile plays a lighter frame subset for smoother playback + lower memory,
  // while always keeping the very first and last frames (clean in/out).
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

  return (
    <BaseImageSequenceScroll
      frames={effectiveFrames}
      frameCount={frameCount ?? effectiveFrames.length}
      width={canvasWidth}
      height={canvasHeight}
      scrollDuration={effectiveScroll}
      scrub={true}
      fit="cover"
      focalX={0.5}
      focalY={0.5}
      background="#050505"
      posterSrc={frames[0]}
      className={`iss-cinematic${className ? ` ${className}` : ""}`}
      dataLocation={location}
      dataSource={video}
    >
      {/* No-JS / no-canvas fallback: show the first frame as a static hero so
          the section is never blank. */}
      <noscript>
        <img
          src={frames[0]}
          alt="Desi Dhamaka entrance"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      </noscript>
    </BaseImageSequenceScroll>
  );
}
