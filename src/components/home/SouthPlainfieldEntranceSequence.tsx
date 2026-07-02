import { useEffect, useState } from "react";
import ImageSequenceScroll from "../animations/ImageSequenceScroll";
import SectionPlaceholder from "../ui/SectionPlaceholder";
import { fetchFrameManifest, type FrameManifest } from "../../utils/frameManifest";
import {
  SP_ENTRANCE_MANIFEST_URL,
  SP_ENTRANCE_SCROLL_LENGTH,
  SP_ENTRANCE_VIDEO_SRC,
} from "../../data/southPlainfieldEntrance";

/**
 * Cinematic scroll experience shown in the SECOND section of the
 * South Plainfield homepage only (see HomePage location gate).
 */
export default function SouthPlainfieldEntranceSequence() {
  const [manifest, setManifest] = useState<FrameManifest | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchFrameManifest(SP_ENTRANCE_MANIFEST_URL)
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

  if (error) {
    return (
      <section className="section">
        <div className="section__lead">
          South Plainfield frames not found. Run{" "}
          <code>npm run extract:sp-entrance</code> to generate the image
          sequence, then reload.
        </div>
      </section>
    );
  }

  if (!manifest) {
    return (
      <SectionPlaceholder
        dark
        minHeight="100vh"
        label="Loading South Plainfield experience"
      />
    );
  }

  // Overlay intentionally omitted — the cinematic sequence is the only
  // storytelling element; supporting content lives in the next section.
  return (
    <ImageSequenceScroll
      frames={manifest.frames}
      frameCount={manifest.frameCount}
      width={manifest.width}
      height={manifest.height}
      scrollLength={SP_ENTRANCE_SCROLL_LENGTH}
      videoSrc={SP_ENTRANCE_VIDEO_SRC}
    />
  );
}
