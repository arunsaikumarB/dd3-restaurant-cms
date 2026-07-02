import { useEffect, useRef, useState } from "react";
import ImageSequenceScroll from "../ImageSequenceScroll";
import SectionPlaceholder from "../ui/SectionPlaceholder";
import { fetchFrameManifest, type FrameManifest } from "../../utils/frameManifest";

export default function EntranceImageSequence() {
  const [manifest, setManifest] = useState<FrameManifest | null>(null);
  const [error, setError] = useState(false);
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
      <div className="seq-progress">
        <div className="seq-progress__bar" ref={progressBarRef} />
      </div>
    </ImageSequenceScroll>
  );
}
