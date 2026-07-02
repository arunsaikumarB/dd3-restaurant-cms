const MAX_LONGEST_SIDE = 1920;
const WEBP_QUALITY = 0.8;
const WEBP_PASSTHROUGH_MAX_BYTES = 500 * 1024;

export const ADMIN_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

export type OptimizeImageResult = {
  file: File;
  sizeBytes: number;
  optimized: boolean;
};

export class ImageOptimizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageOptimizeError";
  }
}

export function formatImageFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  return (
    type === "image/heic" ||
    type === "image/heif" ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

export function shouldSkipImageOptimization(file: File): boolean {
  const type = file.type.toLowerCase();
  return (
    type === "image/x-icon" ||
    type === "image/vnd.microsoft.icon" ||
    file.name.toLowerCase().endsWith(".ico")
  );
}

function webpFileName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "") || "image";
  return `${base}.webp`;
}

export function willOptimizeImage(
  file: File,
  options?: { skipOptimization?: boolean },
): boolean {
  if (options?.skipOptimization || shouldSkipImageOptimization(file)) {
    return false;
  }
  if (!file.type.startsWith("image/") && !isHeicFile(file)) {
    return true;
  }
  if (file.type === "image/webp" && file.size < WEBP_PASSTHROUGH_MAX_BYTES) {
    return false;
  }
  return true;
}

/**
 * Resize (max 1920px longest side) and convert raster images to WebP before upload.
 * Existing stored images are not modified — only new uploads pass through this helper.
 */
export async function optimizeImageForUpload(
  file: File,
  options?: { skipOptimization?: boolean },
): Promise<OptimizeImageResult> {
  if (options?.skipOptimization || shouldSkipImageOptimization(file)) {
    return { file, sizeBytes: file.size, optimized: false };
  }

  if (!file.type.startsWith("image/") && !isHeicFile(file)) {
    throw new ImageOptimizeError("Please select an image file.");
  }

  if (file.type === "image/webp" && file.size < WEBP_PASSTHROUGH_MAX_BYTES) {
    return { file, sizeBytes: file.size, optimized: false };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    if (isHeicFile(file)) {
      throw new ImageOptimizeError(
        "Your browser cannot open HEIC photos. Please upload a JPG or PNG instead.",
      );
    }
    throw new ImageOptimizeError(
      "Could not read this image. The file may be corrupt or in an unsupported format.",
    );
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const scale = Math.min(1, MAX_LONGEST_SIDE / longest);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new ImageOptimizeError("Image optimization is not supported in this browser.");
    }

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/webp", WEBP_QUALITY);
    });

    if (!blob) {
      throw new ImageOptimizeError("Could not convert this image to WebP. Try a different file.");
    }

    const optimized = new File([blob], webpFileName(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });

    return { file: optimized, sizeBytes: optimized.size, optimized: true };
  } finally {
    bitmap.close();
  }
}
