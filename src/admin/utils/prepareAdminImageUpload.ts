import {
  formatImageFileSize,
  ImageOptimizeError,
  optimizeImageForUpload,
  willOptimizeImage,
} from "../../utils/imageOptimize";

export type PreparedImageUpload = {
  url: string;
  sizeLabel: string;
};

export type ImageUploadPhase = "optimizing" | "uploading";

export async function prepareAdminImageUpload(
  file: File,
  onUpload: (file: File) => Promise<string>,
  options?: {
    skipOptimization?: boolean;
    onPhase?: (phase: ImageUploadPhase) => void;
  },
): Promise<PreparedImageUpload> {
  if (willOptimizeImage(file, options)) {
    options?.onPhase?.("optimizing");
  }
  const { file: prepared, sizeBytes } = await optimizeImageForUpload(file, options);

  options?.onPhase?.("uploading");
  const url = await onUpload(prepared);

  return {
    url,
    sizeLabel: formatImageFileSize(sizeBytes),
  };
}

export function imageUploadErrorMessage(err: unknown): string {
  if (err instanceof ImageOptimizeError) {
    return err.message;
  }
  return err instanceof Error ? err.message : "Upload failed.";
}
