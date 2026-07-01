import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";
import AdminButton from "../ui/Button";
import { AdminSkeleton } from "../ui/Skeleton";

type MediaKind = "image" | "video";

interface MediaUploadFieldProps {
  label: string;
  value: string | null;
  kind: MediaKind;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  accept?: string;
  disabled?: boolean;
  helpText?: string;
}

const DEFAULT_ACCEPT: Record<MediaKind, string> = {
  image: "image/png,image/jpeg,image/webp",
  video: "video/mp4",
};

export default function MediaUploadField({
  label,
  value,
  kind,
  onChange,
  onUpload,
  accept,
  disabled = false,
  helpText,
}: MediaUploadFieldProps) {
  const { dark } = useAdminTheme();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const url = await onUpload(file);
      onChange(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const uploadLabel = kind === "image" ? "image" : "video";

  return (
    <div className="space-y-2">
      <p className={`text-sm font-medium ${dark ? "text-white/80" : "text-admin-text/80"}`}>
        {label}
      </p>
      <div
        className={[
          "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center",
          dark ? "border-admin-border-dark" : "border-admin-border",
        ].join(" ")}
      >
        <div
          className={[
            "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border",
            dark ? "border-admin-border-dark bg-white/5" : "border-admin-border bg-admin-ivory/50",
          ].join(" ")}
        >
          {uploading ? (
            <AdminSkeleton className="h-full w-full rounded-xl" />
          ) : value && kind === "image" ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : value && kind === "video" ? (
            <video src={value} className="h-full w-full object-cover" muted playsInline />
          ) : (
            <span className={`text-xs ${dark ? "text-white/40" : "text-admin-muted"}`}>
              No {uploadLabel}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept ?? DEFAULT_ACCEPT[kind]}
            className="hidden"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <AdminButton
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={14} />
            {uploading ? "Uploading…" : value ? `Replace ${uploadLabel}` : `Upload ${uploadLabel}`}
          </AdminButton>
          {value && (
            <AdminButton
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || uploading}
              onClick={() => onChange("")}
            >
              Remove
            </AdminButton>
          )}
          {uploadError && <p className="text-xs text-admin-danger">{uploadError}</p>}
          {helpText ? (
            <p className={`text-xs ${dark ? "text-white/45" : "text-admin-muted"}`}>{helpText}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
