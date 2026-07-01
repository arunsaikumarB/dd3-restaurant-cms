const MAX_UPLOAD_WIDTH = 1920;
const JPEG_QUALITY = 0.8;
const WEBP_QUALITY = 0.8;

function outputMimeType(file: File): "image/jpeg" | "image/webp" {
  return file.type === "image/webp" ? "image/webp" : "image/jpeg";
}

function outputExtension(mimeType: "image/jpeg" | "image/webp"): string {
  return mimeType === "image/webp" ? "webp" : "jpg";
}

/**
 * Downscale and re-encode gallery images before Supabase upload.
 * Existing stored images are not modified — only new uploads.
 */
export async function resizeImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    return file;
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const scale = Math.min(1, MAX_UPLOAD_WIDTH / bitmap.width);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const mimeType = outputMimeType(file);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(
      resolve,
      mimeType,
      mimeType === "image/webp" ? WEBP_QUALITY : JPEG_QUALITY,
    );
  });

  if (!blob) {
    return file;
  }

  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.${outputExtension(mimeType)}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}
