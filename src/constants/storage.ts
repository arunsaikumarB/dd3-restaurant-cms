import type { StorageBucket } from "../types/database";

/** Cache-Control max-age for Supabase Storage uploads (1 year). */
export const STORAGE_CACHE_CONTROL = "31536000";

/** 10 MB — standard image uploads (menu, offers, gallery, settings, hero images). */
export const STORAGE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** 8 MB — hero background videos (admin CMS + upload guard). */
export const STORAGE_HERO_VIDEO_MAX_BYTES = 8 * 1024 * 1024;

export const HERO_VIDEO_TOO_LARGE_MESSAGE =
  "Video too large — please compress to under 8MB. Large videos slow the site and increase hosting costs.";

const VIDEO_MIME_PREFIX = "video/";

export function isVideoUpload(file: File): boolean {
  if (file.type.startsWith(VIDEO_MIME_PREFIX)) return true;
  return /\.(mp4|m4v|mov)$/i.test(file.name);
}

export function getMaxUploadBytes(bucket: StorageBucket, file: File): number {
  if (bucket === "homepage-images" && isVideoUpload(file)) {
    return STORAGE_HERO_VIDEO_MAX_BYTES;
  }
  return STORAGE_IMAGE_MAX_BYTES;
}

export function formatMaxUploadSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return Number.isInteger(mb) ? `${mb} MB` : `${mb.toFixed(1)} MB`;
}

export function validateAdminVideoUpload(file: File): string | null {
  if (!isVideoUpload(file)) {
    return null;
  }
  if (file.size <= STORAGE_HERO_VIDEO_MAX_BYTES) {
    return null;
  }
  return HERO_VIDEO_TOO_LARGE_MESSAGE;
}

export function validateUploadFileSize(bucket: StorageBucket, file: File): string | null {
  const maxBytes = getMaxUploadBytes(bucket, file);
  if (file.size <= maxBytes) {
    return null;
  }

  if (bucket === "homepage-images" && isVideoUpload(file)) {
    return HERO_VIDEO_TOO_LARGE_MESSAGE;
  }

  const limitLabel = formatMaxUploadSize(maxBytes);
  return `File is too large. Images must be ${limitLabel} or less.`;
}
