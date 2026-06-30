import { createClientIfConfigured } from "../../lib/supabase/client";
import { validateUploadFileSize } from "../../constants/storage";
import type { StorageBucket } from "../../types/database";

export interface UploadOptions {
  bucket: StorageBucket;
  file: File;
  path?: string;
  upsert?: boolean;
}

export interface UploadResult {
  path: string;
  publicUrl: string;
}

function buildObjectPath(file: File, path?: string): string {
  if (path) return path;
  const ext = file.name.split(".").pop() ?? "bin";
  const id = crypto.randomUUID();
  return `${id}.${ext}`;
}

/**
 * Upload a file to Supabase Storage.
 * Requires authenticated admin session (enforced by RLS).
 */
export async function uploadFile({
  bucket,
  file,
  path,
  upsert = false,
}: UploadOptions): Promise<UploadResult> {
  const supabase = createClientIfConfigured();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const sizeError = validateUploadFileSize(bucket, file);
  if (sizeError) {
    throw new Error(sizeError);
  }

  const objectPath = buildObjectPath(file, path);

  const { error } = await supabase.storage.from(bucket).upload(objectPath, file, {
    cacheControl: "3600",
    upsert,
    contentType: file.type,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);

  return {
    path: objectPath,
    publicUrl: data.publicUrl,
  };
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(bucket: StorageBucket, path: string): Promise<void> {
  const supabase = createClientIfConfigured();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Resolve a public URL for an object already in storage.
 */
export function getPublicUrl(bucket: StorageBucket, path: string): string {
  const supabase = createClientIfConfigured();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
