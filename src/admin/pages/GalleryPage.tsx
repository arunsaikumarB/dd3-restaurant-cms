import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Link2, RefreshCw, Trash2, Upload } from "lucide-react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminCard from "../components/ui/Card";
import AdminBadge from "../components/ui/Badge";
import AdminInput from "../components/ui/Input";
import AdminTextarea from "../components/ui/Textarea";
import AdminButton from "../components/ui/Button";
import AdminToggle from "../components/ui/Toggle";
import AdminToast from "../components/ui/Toast";
import GalleryPageSkeleton from "../components/settings/GalleryPageSkeleton";
import { useAdminTheme } from "../context/AdminThemeContext";
import {
  GALLERY_ADMIN_LOCATIONS,
  GALLERY_PAGE_SECTIONS,
  getGallerySectionDefinition,
  getPageFromSection,
  type GalleryAdminLocationId,
  type GallerySectionKey,
} from "../../config/gallerySections";
import {
  createGalleryImage,
  deleteGalleryImage,
  fetchGalleryImages,
  matchesGalleryLocation,
  updateGalleryFields,
  uploadGalleryImageFile,
  type GalleryCardRow,
} from "../../services/gallery";
import { invalidateGallerySectionCache } from "../../services/galleryPublic";
import {
  imageUploadErrorMessage,
  prepareAdminImageUpload,
} from "../utils/prepareAdminImageUpload";
import { ADMIN_IMAGE_ACCEPT } from "../../utils/imageOptimize";

const EXPANDED_PAGES_KEY = "dd3.admin.gallery.expandedPages";
const SELECTED_SECTION_KEY = "dd3.admin.gallery.selectedSection";

function readExpandedPages(): Record<string, boolean> {
  if (typeof window === "undefined") return { home: true };
  try {
    const raw = localStorage.getItem(EXPANDED_PAGES_KEY);
    if (!raw) return { home: true };
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return { home: true };
  }
}

function readSelectedSection(): GallerySectionKey {
  if (typeof window === "undefined") return "ambience";
  const stored = localStorage.getItem(SELECTED_SECTION_KEY);
  return (stored as GallerySectionKey) || "ambience";
}

export default function GalleryManagementPage() {
  const { dark } = useAdminTheme();
  const [allImages, setAllImages] = useState<GalleryCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<GalleryAdminLocationId>("south-plainfield");
  const [selectedSection, setSelectedSection] = useState<GallerySectionKey>(readSelectedSection);
  const [expandedPages, setExpandedPages] = useState<Record<string, boolean>>(readExpandedPages);
  const [optimizing, setOptimizing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lastUploadSize, setLastUploadSize] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newCaption, setNewCaption] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [applyAllLocations, setApplyAllLocations] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });

  const sectionDef = getGallerySectionDefinition(selectedSection);

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    setToast({ open: true, message, variant });
  }, []);

  const loadImages = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchGalleryImages();
      setAllImages(rows);
      invalidateGallerySectionCache();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load gallery images.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  const countForSection = useCallback(
    (section: GallerySectionKey, locationId: GalleryAdminLocationId) =>
      allImages.filter(
        (img) => img.section === section && matchesGalleryLocation(img.location_id, locationId),
      ).length,
    [allImages],
  );

  const sectionImages = useMemo(
    () =>
      sortGalleryRows(
        allImages.filter(
          (img) =>
            img.section === selectedSection &&
            matchesGalleryLocation(img.location_id, selectedLocation),
        ),
      ),
    [allImages, selectedSection, selectedLocation],
  );

  const canAddMore =
    !sectionDef || sectionDef.maxImages === 0 || sectionImages.length < sectionDef.maxImages;
  const uploadBusy = optimizing || uploading;

  const selectSection = (section: GallerySectionKey) => {
    setSelectedSection(section);
    localStorage.setItem(SELECTED_SECTION_KEY, section);
    setNewTitle("");
    setNewCaption("");
    setNewUrl("");
  };

  const togglePage = (page: string) => {
    setExpandedPages((prev) => {
      const next = { ...prev, [page]: !prev[page] };
      localStorage.setItem(EXPANDED_PAGES_KEY, JSON.stringify(next));
      return next;
    });
  };

  const refreshRow = (updated: GalleryCardRow) => {
    setAllImages((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    invalidateGallerySectionCache();
  };

  const handleFieldUpdate = async (
    id: string,
    patch: Parameters<typeof updateGalleryFields>[1],
  ) => {
    setSavingId(id);
    try {
      const updated = await updateGalleryFields(id, patch);
      refreshRow(updated);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save changes.", "error");
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (img: GalleryCardRow) => {
    if (deletingId) return;
    setDeletingId(img.id);
    try {
      await deleteGalleryImage(img.id, img.image);
      setAllImages((prev) => prev.filter((row) => row.id !== img.id));
      invalidateGallerySectionCache();
      showToast("Image deleted.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete image.", "error");
    } finally {
      setDeletingId(null);
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!sectionDef) return;
    if (!canAddMore && sectionDef.maxImages === 1 && sectionImages.length >= 1) {
      showToast("This section allows only one image. Delete or replace the existing image first.", "error");
      return;
    }

    setOptimizing(true);
    setUploading(false);
    setLastUploadSize(null);
    try {
      const { url: publicUrl, sizeLabel } = await prepareAdminImageUpload(
        file,
        (prepared) => uploadGalleryImageFile(prepared, selectedSection),
        {
          onPhase: (phase) => {
            setOptimizing(phase === "optimizing");
            setUploading(phase === "uploading");
          },
        },
      );
      setLastUploadSize(sizeLabel);
      const created = await createGalleryImage({
        image: publicUrl,
        category: "Ambiance",
        alt_text: newTitle.trim() || sectionDef.label,
        title: newTitle.trim(),
        caption: newCaption.trim(),
        display_order: sectionImages.length + 1,
        featured: false,
        visible: true,
        section: selectedSection,
        location_id: applyAllLocations ? "all" : selectedLocation,
        page: getPageFromSection(selectedSection),
      });
      setAllImages((prev) => sortGalleryRows([...prev, created]));
      invalidateGallerySectionCache();
      setNewTitle("");
      setNewCaption("");
      setNewUrl("");
      showToast("Image uploaded successfully.");
    } catch (err) {
      showToast(imageUploadErrorMessage(err), "error");
    } finally {
      setOptimizing(false);
      setUploading(false);
    }
  };

  const handleAddFromUrl = async () => {
    if (!newUrl.trim()) {
      showToast("Paste an image URL first.", "error");
      return;
    }
    if (!sectionDef) return;

    setUploading(true);
    try {
      const created = await createGalleryImage({
        image: newUrl.trim(),
        category: "Ambiance",
        alt_text: newTitle.trim() || sectionDef.label,
        title: newTitle.trim(),
        caption: newCaption.trim(),
        display_order: sectionImages.length + 1,
        featured: false,
        visible: true,
        section: selectedSection,
        location_id: applyAllLocations ? "all" : selectedLocation,
        page: getPageFromSection(selectedSection),
      });
      setAllImages((prev) => sortGalleryRows([...prev, created]));
      invalidateGallerySectionCache();
      setNewTitle("");
      setNewCaption("");
      setNewUrl("");
      showToast("Image added successfully.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add image.", "error");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Gallery" }]} />
        <PageHeader title="Gallery" description="Manage all website images by section." />
        <GalleryPageSkeleton />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Gallery" }]} />
        <PageHeader title="Gallery" description="Manage all website images by section." />
        <AdminCard>
          <p className="text-sm text-admin-danger">{loadError}</p>
          <div className="mt-4">
            <AdminButton type="button" onClick={() => void loadImages()}>
              Retry
            </AdminButton>
          </div>
        </AdminCard>
      </div>
    );
  }

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Gallery" }]} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          title="Gallery"
          description="Manage all website images by page section. Pick a location, choose a section, then upload or edit images."
        />
        <AdminButton variant="outline" onClick={() => void loadImages()}>
          <RefreshCw size={16} />
          Refresh
        </AdminButton>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {GALLERY_ADMIN_LOCATIONS.map((loc) => (
          <button
            key={loc.value}
            type="button"
            onClick={() => setSelectedLocation(loc.value)}
            className={[
              "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
              selectedLocation === loc.value
                ? "bg-admin-primary text-white"
                : dark
                  ? "bg-white/10 text-white/80 hover:bg-white/15"
                  : "bg-admin-ivory text-admin-text hover:bg-admin-border/40",
            ].join(" ")}
          >
            {loc.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <AdminCard className="h-fit p-0" padding="sm">
          <nav className="p-2" aria-label="Gallery sections">
            {GALLERY_PAGE_SECTIONS.map((pageDef) => {
              const isExpanded = expandedPages[pageDef.page] ?? pageDef.page === "home";
              return (
                <div key={pageDef.page} className="mb-1">
                  <button
                    type="button"
                    onClick={() => togglePage(pageDef.page)}
                    className={[
                      "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold",
                      dark ? "text-white/90 hover:bg-white/5" : "text-admin-text hover:bg-admin-ivory",
                    ].join(" ")}
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    {pageDef.label}
                  </button>
                  {isExpanded ? (
                    <ul className="mb-2 ml-2 space-y-0.5 border-l border-admin-border/40 pl-2 dark:border-white/10">
                      {pageDef.sections.map((section) => {
                        const count = countForSection(section.key, selectedLocation);
                        const isActive = selectedSection === section.key;
                        return (
                          <li key={section.key}>
                            <button
                              type="button"
                              onClick={() => selectSection(section.key)}
                              className={[
                                "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs",
                                isActive
                                  ? "bg-admin-primary/15 text-admin-primary"
                                  : dark
                                    ? "text-white/70 hover:bg-white/5"
                                    : "text-admin-muted hover:bg-admin-ivory",
                              ].join(" ")}
                            >
                              <span className="truncate">{section.label}</span>
                              <span
                                className={[
                                  "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                  count === 0
                                    ? "bg-admin-danger/15 text-admin-danger"
                                    : dark
                                      ? "bg-white/10 text-white/60"
                                      : "bg-admin-ivory text-admin-muted",
                                ].join(" ")}
                              >
                                {count}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </AdminCard>

        <div className="space-y-6">
          {sectionDef ? (
            <AdminCard>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{sectionDef.label}</h2>
                  <p className={`mt-1 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
                    {sectionDef.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AdminBadge variant="outline">
                    {GALLERY_ADMIN_LOCATIONS.find((l) => l.value === selectedLocation)?.label}
                  </AdminBadge>
                  <AdminBadge variant="outline">
                    {sectionDef.maxImages === 0
                      ? `${sectionImages.length} images`
                      : `${sectionImages.length} / ${sectionDef.maxImages}`}
                  </AdminBadge>
                </div>
              </div>

              {sectionImages.length > 0 ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sectionImages.map((img) => (
                    <div
                      key={img.id}
                      className={[
                        "overflow-hidden rounded-xl border",
                        dark ? "border-white/10 bg-white/5" : "border-admin-border bg-white",
                      ].join(" ")}
                    >
                      <img
                        src={img.image}
                        alt={img.alt_text || img.title}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      <div className="space-y-3 p-3">
                        <AdminInput
                          label="Title"
                          value={img.title}
                          disabled={savingId === img.id}
                          onChange={(e) =>
                            setAllImages((prev) =>
                              prev.map((row) =>
                                row.id === img.id ? { ...row, title: e.target.value } : row,
                              ),
                            )
                          }
                          onBlur={(e) => void handleFieldUpdate(img.id, { title: e.target.value })}
                        />
                        <AdminTextarea
                          label="Caption"
                          value={img.caption}
                          disabled={savingId === img.id}
                          onChange={(e) =>
                            setAllImages((prev) =>
                              prev.map((row) =>
                                row.id === img.id ? { ...row, caption: e.target.value } : row,
                              ),
                            )
                          }
                          onBlur={(e) => void handleFieldUpdate(img.id, { caption: e.target.value })}
                        />
                        <AdminInput
                          label="Display order"
                          type="number"
                          min={0}
                          value={String(img.display_order)}
                          disabled={savingId === img.id}
                          onChange={(e) =>
                            setAllImages((prev) =>
                              prev.map((row) =>
                                row.id === img.id
                                  ? { ...row, display_order: Number(e.target.value) }
                                  : row,
                              ),
                            )
                          }
                          onBlur={(e) =>
                            void handleFieldUpdate(img.id, {
                              display_order: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                        />
                        <AdminToggle
                          checked={img.visible}
                          onChange={(checked) => void handleFieldUpdate(img.id, { visible: checked })}
                          label={img.visible ? "Visible on website" : "Hidden"}
                        />
                        <AdminToggle
                          checked={img.featured}
                          onChange={(checked) => void handleFieldUpdate(img.id, { featured: checked })}
                          label={img.featured ? "Featured" : "Not featured"}
                        />
                        <AdminButton
                          type="button"
                          variant="outline"
                          className="w-full text-admin-danger"
                          disabled={deletingId === img.id}
                          onClick={() => void handleDelete(img)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </AdminButton>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={`mt-6 text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
                  No images for this section and location yet. The website will use fallback images until you upload one.
                </p>
              )}

              {canAddMore ? (
                <div
                  className={[
                    "mt-6 rounded-xl border border-dashed p-5",
                    dark ? "border-white/15 bg-white/[0.02]" : "border-admin-border bg-admin-ivory/40",
                  ].join(" ")}
                >
                  <h3 className="text-sm font-semibold">
                    {sectionDef.maxImages === 1 && sectionImages.length === 0
                      ? "Add image to this section"
                      : sectionDef.maxImages === 1 && sectionImages.length >= 1
                        ? "Replace image"
                        : "Add image to this section"}
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <AdminInput
                      label="Title"
                      placeholder={sectionDef.hasTitle ? "e.g. Reception" : "Optional title"}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                    />
                    <AdminInput
                      label="Caption"
                      placeholder={sectionDef.hasCaption ? "e.g. Your First Welcome" : "Optional caption"}
                      value={newCaption}
                      onChange={(e) => setNewCaption(e.target.value)}
                    />
                  </div>
                  <div className="mt-3">
                    <AdminToggle
                      checked={applyAllLocations}
                      onChange={setApplyAllLocations}
                      label="Apply to all locations"
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ADMIN_IMAGE_ACCEPT}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUploadFile(file);
                        e.target.value = "";
                      }}
                    />
                    <AdminButton
                      type="button"
                      disabled={uploadBusy}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={16} />
                      {optimizing
                        ? "Optimizing image…"
                        : uploading
                          ? "Uploading…"
                          : "Upload from computer"}
                    </AdminButton>
                    {lastUploadSize && (
                      <p className={`self-center text-xs ${dark ? "text-white/50" : "text-admin-muted"}`}>
                        {lastUploadSize}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <AdminInput
                      label="Or paste image URL"
                      placeholder="https://..."
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                    />
                    <div className="flex items-end">
                      <AdminButton
                        type="button"
                        variant="outline"
                        disabled={uploadBusy || !newUrl.trim()}
                        onClick={() => void handleAddFromUrl()}
                      >
                        <Link2 size={16} />
                        Add URL
                      </AdminButton>
                    </div>
                  </div>
                </div>
              ) : null}
            </AdminCard>
          ) : null}
        </div>
      </div>

      <AdminToast
        open={toast.open}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}

function sortGalleryRows(rows: GalleryCardRow[]): GalleryCardRow[] {
  return [...rows].sort((a, b) => {
    const orderDiff = a.display_order - b.display_order;
    if (orderDiff !== 0) return orderDiff;
    return b.created_at.localeCompare(a.created_at);
  });
}
