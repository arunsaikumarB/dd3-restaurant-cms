import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";
import AdminButton from "../ui/Button";
import { AdminSkeleton } from "../ui/Skeleton";

interface ImageUploadFieldProps {
  label: string;
  value: string | null;
  onChange: (url: string) => void;
  onUpload: (file: File) => Promise<string>;
  accept?: string;
  disabled?: boolean;
}

export default function ImageUploadField({
  label,
  value,
  onChange,
  onUpload,
  accept = "image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon",
  disabled = false,
}: ImageUploadFieldProps) {
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
          ) : value ? (
            <img src={value} alt="" className="h-full w-full object-contain" />
          ) : (
            <span className={`text-xs ${dark ? "text-white/40" : "text-admin-muted"}`}>No image</span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
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
            {uploading ? "Uploading…" : value ? "Replace image" : "Upload image"}
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
        </div>
      </div>
    </div>
  );
}
