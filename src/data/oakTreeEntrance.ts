/**
 * Oak Tree homepage cinematic entrance sequence.
 *
 * Source video lives at `public/image-sequences/oak-tree.mp4` and is
 * pre-extracted into standalone WebP frames via `npm run extract:oak-tree`
 * (generate once, cached, reused — never regenerated at runtime).
 */

/** Source video — extracted to /image-sequences/oak-tree via `npm run extract:oak-tree`. */
export const OAK_TREE_ENTRANCE_VIDEO_SRC = "/image-sequences/oak-tree.mp4";

/** Pre-extracted frame manifest (frame list + native dimensions). */
export const OAK_TREE_ENTRANCE_MANIFEST_URL =
  "/image-sequences/oak-tree/manifest.json";

/** Scroll length of the pinned section, in viewport heights (desktop). */
export const OAK_TREE_ENTRANCE_SCROLL_LENGTH = 3.2;
