import { useEffect, useRef, useState } from "react";
import ImageSequenceScroll from "../ImageSequenceScroll";
import SectionPlaceholder from "../ui/SectionPlaceholder";
import { usePageContent } from "../../context/PageContentContext";
import { fetchFrameManifest, type FrameManifest } from "../../utils/frameManifest";

export default function EntranceImageSequence() {
  const { fetchSection } = usePageContent();
  const entrance = fetchSection("home", "entrance", {
    kicker: "A warm welcome",
    headline: "Every detail, designed to greet you.",
  });
  const [manifest, setManifest] = useState<FrameManifest | null>(null);
  const [error, setError] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    fetchFrameManifest()
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

  const handleProgress = (p: number) => {
    if (progressBarRef.current) {
      progressBarRef.current.style.transform = `scaleX(${p})`;
    }
    if (overlayRef.current) {
      const opacity = Math.max(0, 1 - p / 0.33);
      overlayRef.current.style.opacity = String(opacity);
      overlayRef.current.style.transform = `translateY(${p * -40}px)`;
    }
  };

  if (error) {
    return (
      <section className="section">
        <div className="section__lead">
          Frames not found. Run <code>npm run extract</code> to generate the
          image sequence, then reload.
        </div>
      </section>
    );
  }

  if (!manifest) {
    return (
      <SectionPlaceholder
        dark
        minHeight="100vh"
        label="Loading entrance experience"
      />
    );
  }

  return (
    <ImageSequenceScroll
      frames={manifest.frames}
      frameCount={manifest.frameCount}
      width={manifest.width}
      height={manifest.height}
      scrollDuration={3}
      scrub={0.6}
      fit="cover"
      onProgress={handleProgress}
    >
      <div className="seq-overlay">
        <div className="seq-overlay__inner" ref={overlayRef}>
          <p className="seq-overlay__kicker">{entrance.kicker}</p>
          <h2 className="seq-overlay__headline">
            {entrance.headline}
          </h2>
        </div>
      </div>
      <div className="seq-progress">
        <div className="seq-progress__bar" ref={progressBarRef} />
      </div>
    </ImageSequenceScroll>
  );
}
