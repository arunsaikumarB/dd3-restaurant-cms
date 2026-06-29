import { useCallback, useEffect, useMemo, useState } from "react";
import { Upload, Trash2, Search, Pencil, Star } from "lucide-react";
import { motion } from "framer-motion";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import AdminCard from "../components/ui/Card";
import AdminBadge from "../components/ui/Badge";
import AdminSelect from "../components/ui/Select";
import AdminModal, { ModalFooter } from "../components/ui/Modal";
import AdminInput from "../components/ui/Input";
import AdminTextarea from "../components/ui/Textarea";
import AdminButton from "../components/ui/Button";
import AdminToggle from "../components/ui/Toggle";
import AdminToast from "../components/ui/Toast";
import ImageUploadField from "../components/settings/ImageUploadField";
import GalleryPageSkeleton from "../components/settings/GalleryPageSkeleton";
import { useAdminTheme } from "../context/AdminThemeContext";
import {
  createGalleryImage,
  deleteGalleryImage,
  EMPTY_GALLERY_FORM,
  fetchGalleryImages,
  getGalleryCategoryOptions,
  rowToForm,
  updateGalleryFeatured,
  updateGalleryImage,
  updateGalleryVisible,
  type GalleryCardRow,
  type GalleryForm,
} from "../../services/gallery";
import { uploadFile } from "../../services/storage/upload";
import {
  hasValidationErrors,
  validateGalleryForm,
  type GalleryErrors,
} from "../../utils/validation/gallery";

type SortOption = "display_order" | "newest" | "oldest" | "alphabetical";
type VisibilityFilter = "all" | "visible" | "hidden" | "featured";

const SORT_OPTIONS = [
  { value: "display_order", label: "Display Order" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "alphabetical", label: "Alphabetical" },
] as const;

const VISIBILITY_FILTER_OPTIONS = [
  { value: "all", label: "All Images" },
  { value: "featured", label: "Featured" },
  { value: "visible", label: "Visible" },
  { value: "hidden", label: "Hidden" },
];

export default function GalleryManagementPage() {
  const { dark } = useAdminTheme();
  const [images, setImages] = useState<GalleryCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<GalleryCardRow | null>(null);
  const [category, setCategory] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("display_order");
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState<GalleryCardRow | null>(null);
  const [form, setForm] = useState<GalleryForm>(EMPTY_GALLERY_FORM);
  const [fieldErrors, setFieldErrors] = useState<GalleryErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [dropUploading, setDropUploading] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    setToast({ open: true, message, variant });
  }, []);

  const loadImages = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchGalleryImages();
      setImages(rows);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load gallery images.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadImages();
  }, [loadImages]);

  const filtered = useMemo(() => {
    let result = [...images];
    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (img) =>
          img.category.toLowerCase().includes(query) ||
          img.caption.toLowerCase().includes(query) ||
          img.alt_text.toLowerCase().includes(query),
      );
    }

    if (category !== "all") {
      result = result.filter((img) => img.category === category);
    }

    if (visibilityFilter === "featured") {
      result = result.filter((img) => img.featured);
    } else if (visibilityFilter === "visible") {
      result = result.filter((img) => img.visible);
    } else if (visibilityFilter === "hidden") {
      result = result.filter((img) => !img.visible);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.created_at.localeCompare(a.created_at);
        case "oldest":
          return a.created_at.localeCompare(b.created_at);
        case "alphabetical":
          return a.title.localeCompare(b.title);
        case "display_order":
        default: {
          const orderDiff = a.display_order - b.display_order;
          if (orderDiff !== 0) return orderDiff;
          return b.created_at.localeCompare(a.created_at);
        }
      }
    });

    return result;
  }, [images, search, category, visibilityFilter, sortBy]);

  const categoryOptions = useMemo(
    () => [{ value: "all", label: "All Categories" }, ...getGalleryCategoryOptions()],
    [],
  );

  const uploadGalleryImage = async (file: File) => {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { publicUrl } = await uploadFile({
      bucket: "gallery-images",
      file,
      path,
      upsert: true,
    });
    return publicUrl;
  };

  const openCreateModal = (initialForm?: Partial<GalleryForm>) => {
    setEditingId(null);
    setForm({ ...EMPTY_GALLERY_FORM, ...initialForm });
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEditModal = (img: GalleryCardRow) => {
    setEditingId(img.id);
    setForm(rowToForm(img));
    setFieldErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting || imageUploading) return;
    setModalOpen(false);
    setEditingId(null);
    setFieldErrors({});
  };

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      return await uploadGalleryImage(file);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = async () => {
    if (submitting || imageUploading) return;

    const errors = validateGalleryForm(form);
    setFieldErrors(errors);
    if (hasValidationErrors(errors)) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateGalleryImage(editingId, form);
        showToast("Image updated successfully.");
      } else {
        await createGalleryImage(form);
        showToast("Image uploaded successfully.");
      }
      setModalOpen(false);
      setEditingId(null);
      setFieldErrors({});
      await loadImages();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save image.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (img: GalleryCardRow) => {
    setDeletingImage(img);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingImage || deleting) return;

    setDeleting(true);
    try {
      await deleteGalleryImage(deletingImage.id);
      showToast("Image deleted successfully.");
      setDeleteOpen(false);
      setDeletingImage(null);
      await loadImages();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete image.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFeatured = async (img: GalleryCardRow) => {
    if (togglingId) return;

    const nextFeatured = !img.featured;
    setTogglingId(img.id);
    try {
      const updated = await updateGalleryFeatured(img.id, nextFeatured);
      setImages((prev) => prev.map((row) => (row.id === img.id ? updated : row)));
      showToast(nextFeatured ? "Image marked as featured." : "Image removed from featured.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update featured status.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleVisible = async (img: GalleryCardRow) => {
    if (togglingId) return;

    const nextVisible = !img.visible;
    setTogglingId(img.id);
    try {
      const updated = await updateGalleryVisible(img.id, nextVisible);
      setImages((prev) => prev.map((row) => (row.id === img.id ? updated : row)));
      showToast(nextVisible ? "Image is now visible." : "Image is now hidden.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update visibility.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files?.[0];
    if (!file?.type.startsWith("image/")) {
      showToast("Please drop a valid image file (PNG, JPG, or WebP).", "error");
      return;
    }

    openCreateModal();
    setDropUploading(true);
    try {
      const url = await uploadGalleryImage(file);
      setForm((prev) => ({ ...prev, image: url }));
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to upload image.", "error");
    } finally {
      setDropUploading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Gallery" }]} />
        <PageHeader
          title="Gallery"
          description="Manage restaurant photos and ambiance images."
          actionLabel="Upload"
          onAction={() => openCreateModal()}
        />
        <GalleryPageSkeleton />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Gallery" }]} />
        <PageHeader
          title="Gallery"
          description="Manage restaurant photos and ambiance images."
          actionLabel="Upload"
          onAction={() => openCreateModal()}
        />
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
      <PageHeader
        title="Gallery"
        description="Manage restaurant photos and ambiance images."
        actionLabel="Upload"
        onAction={() => openCreateModal()}
      />

      <div
        className={[
          "mb-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-colors",
          dragOver ? "border-admin-primary bg-admin-primary/5" : dark ? "border-admin-border-dark" : "border-admin-border",
        ].join(" ")}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { void handleDrop(e); }}
      >
        <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${dark ? "bg-white/10" : "bg-admin-ivory"}`}>
          <Upload size={22} className="text-admin-primary" />
        </div>
        <p className="text-sm font-medium">{dropUploading ? "Uploading…" : "Drag & drop images here"}</p>
        <p className={`mt-1 text-xs ${dark ? "text-white/40" : "text-admin-muted"}`}>
          PNG, JPG up to 10MB
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative max-w-sm flex-1">
          <Search
            size={16}
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-admin-muted"}`}
          />
          <input
            type="search"
            placeholder="Search gallery..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={[
              "h-10 w-full rounded-xl border pl-9 pr-3 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-admin-orange/30",
              dark ? "border-admin-border-dark bg-white/5 text-white" : "border-admin-border bg-white",
            ].join(" ")}
          />
        </div>
        <div className="w-48">
          <AdminSelect
            label="Filter by category"
            value={category}
            onChange={setCategory}
            options={categoryOptions}
          />
        </div>
        <div className="w-48">
          <AdminSelect
            label="Filter"
            value={visibilityFilter}
            onChange={(v) => setVisibilityFilter(v as VisibilityFilter)}
            options={VISIBILITY_FILTER_OPTIONS}
          />
        </div>
        <div className="w-48">
          <AdminSelect
            label="Sort by"
            value={sortBy}
            onChange={(v) => setSortBy(v as SortOption)}
            options={[...SORT_OPTIONS]}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((img, i) => (
          <motion.div
            key={img.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
          >
            <AdminCard className="group overflow-hidden p-0 cursor-pointer" padding="sm">
              <div className="relative aspect-square overflow-hidden rounded-xl">
                <img
                  src={img.url}
                  alt={img.title}
                  className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${!img.visible ? "opacity-60" : ""}`}
                  onClick={() => setPreview(img)}
                />
                {img.featured && (
                  <div className="absolute left-2 top-2 rounded-lg bg-admin-gold/90 p-1.5 text-white">
                    <Star size={14} fill="currentColor" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex w-full items-center justify-between">
                    <AdminBadge variant="outline" className="!text-white !border-white/30">{img.category}</AdminBadge>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className="rounded-lg bg-white/20 p-1.5 text-white backdrop-blur-sm"
                        onClick={(e) => { e.stopPropagation(); openEditModal(img); }}
                        aria-label="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-admin-danger/90 p-1.5 text-white"
                        onClick={(e) => { e.stopPropagation(); openDeleteModal(img); }}
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <p className="mt-2 truncate text-sm font-medium">{img.title}</p>
              <div className="mt-2 flex flex-col gap-2">
                <AdminToggle
                  checked={img.featured}
                  onChange={() => void handleToggleFeatured(img)}
                  label={img.featured ? "Featured" : "Not featured"}
                />
                <AdminToggle
                  checked={img.visible}
                  onChange={() => void handleToggleVisible(img)}
                  label={img.visible ? "Visible" : "Hidden"}
                />
              </div>
            </AdminCard>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <AdminCard className="mt-4">
          <p className="py-8 text-center text-sm">
            {images.length === 0 ? "No gallery images yet." : "No images match your search or filters."}
          </p>
        </AdminCard>
      )}

      <AdminModal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Image" : "Upload Image"}
        size="lg"
        footer={
          <ModalFooter
            onCancel={closeModal}
            onConfirm={() => void handleSave()}
            confirmLabel={editingId ? "Save Changes" : "Upload"}
            loading={submitting || imageUploading}
          />
        }
      >
        <GalleryFormFields
          form={form}
          fieldErrors={fieldErrors}
          disabled={submitting || imageUploading}
          onPatch={setForm}
          onUpload={handleImageUpload}
        />
      </AdminModal>

      <AdminModal open={!!preview} onClose={() => setPreview(null)} title={preview?.title ?? ""} size="lg">
        {preview && (
          <img src={preview.url} alt={preview.title} className="w-full rounded-xl object-cover max-h-[60vh]" />
        )}
      </AdminModal>

      <AdminModal
        open={deleteOpen}
        onClose={() => {
          if (deleting) return;
          setDeleteOpen(false);
          setDeletingImage(null);
        }}
        title="Delete Image"
        footer={
          <ModalFooter
            onCancel={() => {
              if (deleting) return;
              setDeleteOpen(false);
              setDeletingImage(null);
            }}
            onConfirm={() => void handleDelete()}
            confirmLabel="Delete"
            loading={deleting}
          />
        }
      >
        <p className={`text-sm ${dark ? "text-white/70" : "text-admin-text/80"}`}>
          Are you sure you want to delete{" "}
          <span className="font-medium">{deletingImage?.title}</span>? This action cannot be undone.
        </p>
      </AdminModal>

      <AdminToast
        open={toast.open}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
}

interface GalleryFormFieldsProps {
  form: GalleryForm;
  fieldErrors: GalleryErrors;
  disabled?: boolean;
  onPatch: (updater: GalleryForm | ((prev: GalleryForm) => GalleryForm)) => void;
  onUpload: (file: File) => Promise<string>;
}

function GalleryFormFields({ form, fieldErrors, disabled, onPatch, onUpload }: GalleryFormFieldsProps) {
  const patch = (partial: Partial<GalleryForm>) => {
    onPatch((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="space-y-4">
      <ImageUploadField
        label="Image"
        value={form.image}
        disabled={disabled}
        onChange={(url) => patch({ image: url || null })}
        onUpload={onUpload}
      />
      {fieldErrors.image && <p className="text-xs text-admin-danger">{fieldErrors.image}</p>}
      <AdminSelect
        label="Category"
        value={form.category}
        onChange={(value) => patch({ category: value })}
        options={getGalleryCategoryOptions()}
      />
      {fieldErrors.category && <p className="text-xs text-admin-danger">{fieldErrors.category}</p>}
      <AdminInput
        label="Alt Text"
        placeholder="Describe the image for accessibility"
        value={form.alt_text}
        error={fieldErrors.alt_text}
        disabled={disabled}
        onChange={(e) => patch({ alt_text: e.target.value })}
      />
      <AdminTextarea
        label="Caption"
        placeholder="Optional caption shown on the gallery"
        value={form.caption}
        disabled={disabled}
        onChange={(e) => patch({ caption: e.target.value })}
      />
      <AdminInput
        label="Display Order"
        type="number"
        min={0}
        value={String(form.display_order)}
        error={fieldErrors.display_order}
        disabled={disabled}
        onChange={(e) => patch({ display_order: Number(e.target.value) })}
      />
      <AdminToggle
        checked={form.featured}
        onChange={(checked) => patch({ featured: checked })}
        label={form.featured ? "Featured" : "Not featured"}
      />
      <AdminToggle
        checked={form.visible}
        onChange={(checked) => patch({ visible: checked })}
        label={form.visible ? "Visible" : "Hidden"}
      />
    </div>
  );
}
