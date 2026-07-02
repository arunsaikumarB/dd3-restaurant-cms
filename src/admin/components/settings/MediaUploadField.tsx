import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";
import AdminButton from "../ui/Button";
import { AdminSkeleton } from "../ui/Skeleton";
import { ADMIN_IMAGE_ACCEPT } from "../../../utils/imageOptimize";
import { validateAdminVideoUpload } from "../../../constants/storage";
import {
  imageUploadErrorMessage,
  prepareAdminImageUpload,
} from "../../utils/prepareAdminImageUpload";

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
  image: ADMIN_IMAGE_ACCEPT,
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
  const [optimizing, setOptimizing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [optimizedSizeLabel, setOptimizedSizeLabel] = useState<string | null>(null);

  const busy = optimizing || uploading;
  const uploadLabel = kind === "image" ? "image" : "video";

  const handleFile = async (file: File) => {
    setUploadError(null);
    setOptimizedSizeLabel(null);

    if (kind === "video") {
      const videoSizeError = validateAdminVideoUpload(file);
      if (videoSizeError) {
        setUploadError(videoSizeError);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      setUploading(true);
      try {
        const url = await onUpload(file);
        onChange(url);
      } catch (err) {
        setUploadError(imageUploadErrorMessage(err));
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
      return;
    }

    setOptimizing(true);
    setUploading(false);
    try {
      const { url, sizeLabel } = await prepareAdminImageUpload(file, onUpload, {
        onPhase: (phase) => {
          setOptimizing(phase === "optimizing");
          setUploading(phase === "uploading");
        },
      });
      setOptimizedSizeLabel(sizeLabel);
      onChange(url);
    } catch (err) {
      setUploadError(imageUploadErrorMessage(err));
    } finally {
      setOptimizing(false);
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const statusLabel = optimizing
    ? "Optimizing image…"
    : uploading
      ? "Uploading…"
      : value
        ? `Replace ${uploadLabel}`
        : `Upload ${uploadLabel}`;

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
          {busy ? (
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
            disabled={disabled || busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <AdminButton
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={14} />
            {busy ? statusLabel : value ? `Replace ${uploadLabel}` : `Upload ${uploadLabel}`}
          </AdminButton>
          {value && (
            <AdminButton
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || busy}
              onClick={() => {
                setOptimizedSizeLabel(null);
                onChange("");
              }}
            >
              Remove
            </AdminButton>
          )}
          {optimizedSizeLabel && kind === "image" && (
            <p className={`text-xs ${dark ? "text-white/50" : "text-admin-muted"}`}>
              {optimizedSizeLabel}
            </p>
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
