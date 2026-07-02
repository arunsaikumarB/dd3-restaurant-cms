import { useEffect, useState } from "react";
import ImageSequenceScroll from "../animations/ImageSequenceScroll";
import SectionPlaceholder from "../ui/SectionPlaceholder";
import { fetchFrameManifest, type FrameManifest } from "../../utils/frameManifest";
import {
  OAK_TREE_ENTRANCE_MANIFEST_URL,
  OAK_TREE_ENTRANCE_SCROLL_LENGTH,
  OAK_TREE_ENTRANCE_VIDEO_SRC,
} from "../../data/oakTreeEntrance";

/**
 * Cinematic scroll experience shown in the SECOND section of the
 * Oak Tree homepage only (see HomePage location gate). Reuses the shared
 * ImageSequenceScroll engine with Oak Tree's own extracted frame sequence.
 */
export default function OakTreeEntranceSequence() {
  const [manifest, setManifest] = useState<FrameManifest | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchFrameManifest(OAK_TREE_ENTRANCE_MANIFEST_URL)
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
          Oak Tree frames not found. Run{" "}
          <code>npm run extract:oak-tree</code> to generate the image
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
        label="Loading Oak Tree experience"
      />
    );
  }

  // Clean cinematic walkthrough — no overlay, no copy. The footage tells the
  // story; supporting content lives in the next homepage section.
  return (
    <ImageSequenceScroll
      frames={manifest.frames}
      frameCount={manifest.frameCount}
      canvasWidth={manifest.width}
      canvasHeight={manifest.height}
      scrollLength={OAK_TREE_ENTRANCE_SCROLL_LENGTH}
      video={OAK_TREE_ENTRANCE_VIDEO_SRC}
      location="oak-tree"
    />
  );
}
