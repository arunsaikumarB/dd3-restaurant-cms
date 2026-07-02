import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * How a frame is fitted into the canvas while keeping its native aspect ratio.
 * - "cover":   fill the canvas, cropping overflow (full-bleed, Apple-style).
 * - "contain": fit entirely inside the canvas, letterboxing if needed.
 */
export type FrameFit = "cover" | "contain";

export interface ImageSequenceScrollProps {
  /** Explicit list of frame image URLs, in playback order. */
  frames?: string[];
  /**
   * URL template using printf-style padding, e.g. "/frames/frame_%04d.webp".
   * Used together with `frameCount` when `frames` is not provided.
   */
  urlPattern?: string;
  /** Custom resolver: given a 0-based index, return the frame URL. */
  getFrameUrl?: (index: number, count: number) => string;
  /** Total number of frames (required when not passing an explicit `frames` array). */
  frameCount?: number;
  /** First frame index in `urlPattern` numbering (default 1). */
  startIndex?: number;

  /** Native frame width — defines the aspect ratio (default 1280). */
  width?: number;
  /** Native frame height — defines the aspect ratio (default 720). */
  height?: number;

  /**
   * Scroll length of the pinned section, expressed in viewport heights.
   * e.g. 2.5 => the user scrolls 2.5 screens to play the whole sequence.
   */
  scrollDuration?: number;
  /** ScrollTrigger scrub smoothing in seconds (default 0.6). `true` for instant. */
  scrub?: number | boolean;
  /** How the frame fills the canvas (default "cover"). */
  fit?: FrameFit;
  /** Canvas background color shown behind "contain" letterboxing (default "#000"). */
  background?: string;

  className?: string;
  /** Overlay content rendered above the canvas inside the pinned stage. */
  children?: ReactNode;

  /** Fired once every frame has been preloaded. */
  onReady?: () => void;
  /** Fired on each scroll update with progress in the range [0, 1]. */
  onProgress?: (progress: number) => void;
}

function pad(num: number, size: number): string {
  return String(num).padStart(size, "0");
}

/** Resolve "/frames/frame_%04d.webp" with the given number. */
function formatPattern(pattern: string, value: number): string {
  return pattern.replace(/%0?(\d*)d/g, (_m, widthStr: string) => {
    const w = widthStr ? parseInt(widthStr, 10) : 0;
    return pad(value, w);
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const frameImageCache = new Map<string, HTMLImageElement[]>();

function frameCacheKey(urls: string[]): string {
  if (urls.length === 0) return "";
  return `${urls.length}:${urls[0]}:${urls[urls.length - 1]}`;
}

function isCacheReady(images: HTMLImageElement[]): boolean {
  return (
    images.length > 0 &&
    images.every((img) => img.complete && img.naturalWidth > 0)
  );
}

export default function ImageSequenceScroll({
  frames,
  urlPattern,
  getFrameUrl,
  frameCount,
  startIndex = 1,
  width = 1280,
  height = 720,
  scrollDuration = 2.5,
  scrub = 0.6,
  fit = "cover",
  background = "#000",
  className,
  children,
  onReady,
  onProgress,
}: ImageSequenceScrollProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Loaded HTMLImageElements kept in memory (the image cache).
  const imagesRef = useRef<HTMLImageElement[]>([]);
  // rAF bookkeeping so we render at most once per animation frame.
  const rafRef = useRef<number | null>(null);
  const pendingFrameRef = useRef(0);
  const renderedFrameRef = useRef(-1);

  const [loadedCount, setLoadedCount] = useState(0);
  const [ready, setReady] = useState(false);

  // Build the ordered list of frame URLs from whichever prop was provided.
  const resolveUrls = useCallback((): string[] => {
    if (frames && frames.length) return frames;
    const count = frameCount ?? 0;
    if (!count) return [];
    return Array.from({ length: count }, (_, i) => {
      if (getFrameUrl) return getFrameUrl(i, count);
      if (urlPattern) return formatPattern(urlPattern, startIndex + i);
      throw new Error(
        "ImageSequenceScroll: provide `frames`, `urlPattern`, or `getFrameUrl`."
      );
    });
  }, [frames, frameCount, getFrameUrl, urlPattern, startIndex]);

  /** Draw a frame onto the canvas, fitting while preserving aspect ratio. */
  const drawFrame = useCallback(
    (index: number, force = false) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      const total = imagesRef.current.length;
      if (!canvas || !ctx || total === 0) return;

      const idx = clamp(Math.round(index), 0, total - 1);
      if (!force && idx === renderedFrameRef.current) return;

      const img = imagesRef.current[idx];
      if (!img || !img.complete || img.naturalWidth === 0) return;
      renderedFrameRef.current = idx;

      const cw = canvas.width;
      const ch = canvas.height;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;

      const scale =
        fit === "cover"
          ? Math.max(cw / iw, ch / ih)
          : Math.min(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.fillStyle = background;
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, dw, dh);
    },
    [fit, background]
  );

  /** Schedule a render coalesced into the next animation frame. */
  const requestRender = useCallback(
    (index: number) => {
      pendingFrameRef.current = index;
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        drawFrame(pendingFrameRef.current);
      });
    },
    [drawFrame]
  );

  /** Resize the canvas backing store to match its CSS box (DPR-aware) and redraw. */
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = stage.getBoundingClientRect();
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
      drawFrame(renderedFrameRef.current < 0 ? 0 : renderedFrameRef.current, true);
    }
  }, [drawFrame]);

  // ---- Preload every frame before the animation begins. ----
  useEffect(() => {
    const urls = resolveUrls();
    if (urls.length === 0) return;

    const cacheKey = frameCacheKey(urls);
    const cached = frameImageCache.get(cacheKey);
    if (cached && cached.length === urls.length && isCacheReady(cached)) {
      imagesRef.current = cached;
      setLoadedCount(urls.length);
      setReady(true);
      onReady?.();
      return;
    }

    let cancelled = false;
    let loaded = 0;
    const images: HTMLImageElement[] = new Array(urls.length);
    imagesRef.current = images;
    setReady(false);
    setLoadedCount(0);

    const markLoaded = () => {
      if (cancelled) return;
      loaded += 1;
      setLoadedCount(loaded);
      if (loaded === urls.length) {
        frameImageCache.set(cacheKey, images);
        setReady(true);
        onReady?.();
      }
    };

    urls.forEach((url, i) => {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      images[i] = img;
      const done = () => markLoaded();
      if (img.complete && img.naturalWidth > 0) {
        // Already cached by the browser.
        done();
      } else {
        img.onload = done;
        img.onerror = done; // don't deadlock the loader on a missing frame
      }
    });

    return () => {
      cancelled = true;
    };
  }, [resolveUrls, onReady]);

  // ---- Set up the canvas + ScrollTrigger once frames are ready. ----
  useLayoutEffect(() => {
    if (!ready) return;
    const section = sectionRef.current;
    if (!section) return;

    resizeCanvas();
    drawFrame(0, true);

    const ro = new ResizeObserver(() => {
      resizeCanvas();
      ScrollTrigger.refresh();
    });
    if (stageRef.current) ro.observe(stageRef.current);

    const total = imagesRef.current.length;
    const proxy = { frame: 0 };

    const ctx = gsap.context(() => {
      gsap.to(proxy, {
        frame: total - 1,
        ease: "none",
        snap: "frame",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${Math.round(scrollDuration * window.innerHeight)}`,
          pin: true,
          pinSpacing: true,
          scrub,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          fastScrollEnd: true,
          markers: false,
          onUpdate: (self) => {
            requestRender(proxy.frame);
            onProgress?.(self.progress);
          },
        },
      });
    }, section);

    // Recompute after the browser settles (fonts, layout, images decoded).
    const refreshId = window.setTimeout(() => ScrollTrigger.refresh(), 60);

    return () => {
      window.clearTimeout(refreshId);
      ro.disconnect();
      ctx.revert();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      renderedFrameRef.current = -1;
    };
  }, [ready, scrollDuration, scrub, resizeCanvas, drawFrame, requestRender, onProgress]);

  const total = frames?.length ?? frameCount ?? 0;
  const progress = total ? Math.round((loadedCount / total) * 100) : 0;

  return (
    <section
      ref={sectionRef}
      className={className}
      data-aspect={`${width}/${height}`}
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "hidden",
        background,
      }}
    >
      <div
        ref={stageRef}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          background,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            display: "block",
          }}
        />

        {children}

        {!ready && (
          <div
            aria-live="polite"
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 18,
              background,
              color: "#fff",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              zIndex: 5,
            }}
          >
            <div
              style={{
                width: 220,
                height: 3,
                borderRadius: 999,
                background: "rgba(255,255,255,0.15)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "#fff",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
            <span style={{ fontSize: 13, letterSpacing: 2, opacity: 0.7 }}>
              {progress}%
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
