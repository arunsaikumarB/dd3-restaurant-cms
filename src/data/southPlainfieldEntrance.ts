/**
 * South Plainfield homepage cinematic entrance sequence.
 *
 * Source video lives at `public/sp-entrance/sp-entrance.mp4` and is pre-extracted
 * into standalone WebP frames via `npm run extract:sp-entrance` (generate once,
 * cached, reused — never regenerated at runtime).
 */

/** Source video — extracted to /sp-entrance-frames via `npm run extract:sp-entrance`. */
export const SP_ENTRANCE_VIDEO_SRC = "/sp-entrance/sp-entrance.mp4";

/** Pre-extracted frame manifest (frame list + native dimensions). */
export const SP_ENTRANCE_MANIFEST_URL = "/sp-entrance-frames/manifest.json";

/** Scroll length of the pinned section, in viewport heights (desktop). */
export const SP_ENTRANCE_SCROLL_LENGTH = 3.2;

/** Cinematic overlay copy. */
export const SP_ENTRANCE_OVERLAY = {
  eyebrow: "DESI DHAMAKA",
  title: "Step Inside",
  subtitle: "Our South Plainfield Experience",
  body: "Scroll through our doors and discover authentic Indian hospitality—from the entrance to the welcoming reception, one cinematic frame at a time.",
  scrollHint: "Scroll to Explore",
} as const;
