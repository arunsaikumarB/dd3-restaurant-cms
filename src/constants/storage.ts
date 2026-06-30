import type { StorageBucket } from "../types/database";

/** 10 MB — standard image uploads (menu, offers, gallery, settings, hero images). */
export const STORAGE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

/** 100 MB — hero background videos on the homepage. */
export const STORAGE_HERO_VIDEO_MAX_BYTES = 100 * 1024 * 1024;

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

export function validateUploadFileSize(bucket: StorageBucket, file: File): string | null {
  const maxBytes = getMaxUploadBytes(bucket, file);
  if (file.size <= maxBytes) {
    return null;
  }

  const limitLabel = formatMaxUploadSize(maxBytes);
  if (bucket === "homepage-images" && isVideoUpload(file)) {
    return `Video is too large. Hero videos must be ${limitLabel} or less.`;
  }

  return `File is too large. Images must be ${limitLabel} or less.`;
}
