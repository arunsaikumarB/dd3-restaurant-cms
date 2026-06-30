import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FolderOpen, Pencil, Search, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import StatusChip from "../components/shared/StatusChip";
import AdminCard from "../components/ui/Card";
import AdminButton from "../components/ui/Button";
import AdminModal, { ModalFooter } from "../components/ui/Modal";
import AdminInput from "../components/ui/Input";
import AdminSelect from "../components/ui/Select";
import AdminToggle from "../components/ui/Toggle";
import AdminToast from "../components/ui/Toast";
import ImageUploadField from "../components/settings/ImageUploadField";
import CategoriesPageSkeleton from "../components/settings/CategoriesPageSkeleton";
import { useAdminTheme } from "../context/AdminThemeContext";
import { useLocation } from "../hooks/useLocation";
import { resolveMutationLocationId } from "../utils/resolveMutationLocation";
import {
  CategoryDeleteBlockedError,
  createMenuCategory,
  deleteMenuCategory,
  EMPTY_MENU_CATEGORY_FORM,
  fetchAllMenuCategories,
  fetchMenuCategories,
  isSlugTaken,
  rowToForm,
  updateMenuCategory,
  updateMenuCategoryStatus,
  type MenuCategoryForm,
  type MenuCategoryWithCount,
} from "../../services/menuCategories";
import { uploadFile } from "../../services/storage/upload";
import type { ContentStatus } from "../../types/database";
import { slugify } from "../../utils/slug";
import {
  hasValidationErrors,
  resolveCategorySlug,
  validateMenuCategoryForm,
  type MenuCategoryErrors,
} from "../../utils/validation/menuCategories";

const FALLBACK_IMAGE = "/showcase/biryani.jpg";

type SortOption = "display_order" | "name" | "newest" | "oldest";

const SORT_OPTIONS = [
  { value: "display_order", label: "Display Order" },
  { value: "name", label: "Name" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
] as const;

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function CategoryManagementPage() {
  const { dark } = useAdminTheme();
  const { locationId, isAllLocations, scope } = useLocation();
  const [categories, setCategories] = useState<MenuCategoryWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("display_order");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<MenuCategoryWithCount | null>(null);
  const [form, setForm] = useState<MenuCategoryForm>(EMPTY_MENU_CATEGORY_FORM);
  const [fieldErrors, setFieldErrors] = useState<MenuCategoryErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });

  const slugManuallyEdited = useRef(false);

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    setToast({ open: true, message, variant });
  }, []);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = isAllLocations
        ? await fetchAllMenuCategories()
        : await fetchMenuCategories(locationId);
      setCategories(rows);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }, [isAllLocations, locationId]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    setSearch("");
    setModalOpen(false);
    setDeleteOpen(false);
    setEditingId(null);
    setDeletingCategory(null);
  }, [scope]);

  const filteredCategories = useMemo(() => {
    let result = [...categories];
    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter((category) => category.name.toLowerCase().includes(query));
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "newest":
          return b.created_at.localeCompare(a.created_at);
        case "oldest":
          return a.created_at.localeCompare(b.created_at);
        case "display_order":
        default:
          return a.display_order - b.display_order;
      }
    });

    return result;
  }, [categories, search, sortBy]);

  const openCreateModal = () => {
    if (isAllLocations) {
      showToast("Select a single location in the header to add categories.", "error");
      return;
    }
    setEditingId(null);
    setForm({ ...EMPTY_MENU_CATEGORY_FORM, display_order: categories.length });
    setFieldErrors({});
    slugManuallyEdited.current = false;
    setModalOpen(true);
  };

  const openEditModal = (category: MenuCategoryWithCount) => {
    if (isAllLocations) {
      showToast("Select a single location in the header to edit categories.", "error");
      return;
    }
    setEditingId(category.id);
    setForm(rowToForm(category));
    setFieldErrors({});
    slugManuallyEdited.current = true;
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditingId(null);
    setFieldErrors({});
  };

  const patchForm = (patch: Partial<MenuCategoryForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleNameChange = (name: string) => {
    setForm((prev) => {
      const next = { ...prev, name };
      if (!slugManuallyEdited.current) {
        next.slug = slugify(name);
      }
      return next;
    });
  };

  const uploadCategoryImage = async (file: File) => {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `categories/${crypto.randomUUID()}.${ext}`;
    const { publicUrl } = await uploadFile({
      bucket: "menu-images",
      file,
      path,
      upsert: true,
    });
    return publicUrl;
  };

  const handleSave = async () => {
    if (submitting) return;
    if (isAllLocations) {
      showToast("Select a single location in the header to save categories.", "error");
      return;
    }

    const slug = resolveCategorySlug(form.name, form.slug);
    const normalizedForm = { ...form, slug };

    let slugTaken = false;
    try {
      slugTaken = await isSlugTaken(slug, locationId, editingId ?? undefined);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to validate slug.", "error");
      return;
    }

    const errors = validateMenuCategoryForm(normalizedForm, { slugTaken });
    setFieldErrors(errors);
    if (hasValidationErrors(errors)) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateMenuCategory(editingId, normalizedForm, locationId);
        showToast("Category updated successfully.");
      } else {
        await createMenuCategory(normalizedForm, locationId);
        showToast("Category created successfully.");
      }
      setModalOpen(false);
      setEditingId(null);
      await loadCategories();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save category.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (category: MenuCategoryWithCount) => {
    if (isAllLocations) {
      showToast("Select a single location in the header to delete categories.", "error");
      return;
    }
    setDeletingCategory(category);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCategory || deleting) return;

    setDeleting(true);
    try {
      const mutationLocationId = resolveMutationLocationId(
        scope,
        locationId,
        deletingCategory.location_id,
      );
      if (!mutationLocationId) {
        showToast("Select a single location in the header to delete categories.", "error");
        return;
      }
      await deleteMenuCategory(deletingCategory.id, mutationLocationId);
      showToast("Category deleted successfully.");
      setDeleteOpen(false);
      setDeletingCategory(null);
      await loadCategories();
    } catch (err) {
      if (err instanceof CategoryDeleteBlockedError) {
        showToast(err.message, "error");
      } else {
        showToast(err instanceof Error ? err.message : "Failed to delete category.", "error");
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleStatus = async (category: MenuCategoryWithCount) => {
    if (togglingId) return;
    const mutationLocationId = resolveMutationLocationId(
      scope,
      locationId,
      category.location_id,
    );
    if (!mutationLocationId) {
      showToast("Select a single location in the header to update categories.", "error");
      return;
    }

    const nextStatus: ContentStatus = category.status === "active" ? "inactive" : "active";
    setTogglingId(category.id);
    try {
      const updated = await updateMenuCategoryStatus(category.id, nextStatus, mutationLocationId);
      setCategories((prev) =>
        prev.map((row) =>
          row.id === category.id ? { ...row, status: updated.status } : row,
        ),
      );
      showToast(`Category marked as ${nextStatus}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update status.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Categories" }]} />
        <PageHeader
          title="Category Management"
          description="Organize your menu into categories."
          actionLabel="Add Category"
          onAction={openCreateModal}
        />
        <CategoriesPageSkeleton />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Categories" }]} />
        <PageHeader
          title="Category Management"
          description="Organize your menu into categories."
          actionLabel="Add Category"
          onAction={openCreateModal}
        />
        <AdminCard>
          <p className="text-sm text-admin-danger">{loadError}</p>
          <div className="mt-4">
            <AdminButton type="button" onClick={() => void loadCategories()}>
              Retry
            </AdminButton>
          </div>
        </AdminCard>
      </div>
    );
  }

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Categories" }]} />
      <PageHeader
        title="Category Management"
        description="Organize your menu into categories."
        actionLabel="Add Category"
        onAction={openCreateModal}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search
            size={16}
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-admin-muted"}`}
          />
          <input
            type="search"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={[
              "h-10 w-full rounded-xl border pl-9 pr-3 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-admin-orange/30",
              dark ? "border-admin-border-dark bg-white/5 text-white" : "border-admin-border bg-white",
            ].join(" ")}
          />
        </div>
        <div className="w-44">
          <AdminSelect
            value={sortBy}
            onChange={(value) => setSortBy(value as SortOption)}
            options={[...SORT_OPTIONS]}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredCategories.map((cat, i) => (
          <motion.div
            key={cat.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <AdminCard className="group overflow-hidden p-0 hover:shadow-admin-lg transition-shadow">
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={cat.image ?? FALLBACK_IMAGE}
                  alt={cat.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <p className="absolute bottom-3 left-3 text-lg font-semibold text-white">{cat.name}</p>
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <span className={`text-sm ${dark ? "text-white/50" : "text-admin-muted"}`}>
                    {cat.itemCount} items
                    {isAllLocations && cat.locationName ? ` · ${cat.locationName}` : ""}
                  </span>
                  <div className="flex gap-1">
                    <AdminButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Edit"
                      onClick={() => openEditModal(cat)}
                    >
                      <Pencil size={14} />
                    </AdminButton>
                    <AdminButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label="Delete"
                      onClick={() => openDeleteModal(cat)}
                    >
                      <Trash2 size={14} className="text-admin-danger" />
                    </AdminButton>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <StatusChip status={cat.status} />
                  <AdminToggle
                    checked={cat.status === "active"}
                    onChange={() => void handleToggleStatus(cat)}
                    label={cat.status === "active" ? "Active" : "Inactive"}
                  />
                </div>
              </div>
            </AdminCard>
          </motion.div>
        ))}
      </div>

      {filteredCategories.length === 0 && (
        <AdminCard>
          <div className="flex flex-col items-center py-12">
            <FolderOpen size={32} className="text-admin-muted" />
            <p className="mt-3 text-sm">
              {categories.length === 0 ? "No categories yet" : "No categories match your search"}
            </p>
          </div>
        </AdminCard>
      )}

      <AdminModal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Category" : "Add Category"}
        footer={
          <ModalFooter
            onCancel={closeModal}
            onConfirm={() => void handleSave()}
            confirmLabel={editingId ? "Save Changes" : "Add Category"}
            loading={submitting}
          />
        }
      >
        <div className="space-y-4">
          <AdminInput
            label="Category Name"
            placeholder="Biryani"
            value={form.name}
            error={fieldErrors.name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
          <AdminInput
            label="Slug"
            placeholder="biryani"
            value={form.slug}
            error={fieldErrors.slug}
            onChange={(e) => {
              slugManuallyEdited.current = true;
              patchForm({ slug: e.target.value });
            }}
          />
          <ImageUploadField
            label="Category Image"
            value={form.image}
            disabled={submitting}
            onChange={(url) => patchForm({ image: url || null })}
            onUpload={uploadCategoryImage}
          />
          <AdminInput
            label="Display Order"
            type="number"
            min={0}
            value={String(form.display_order)}
            error={fieldErrors.display_order}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              patchForm({ display_order: Number.isFinite(parsed) ? parsed : 0 });
            }}
          />
          <AdminSelect
            label="Status"
            value={form.status}
            onChange={(value) => patchForm({ status: value as ContentStatus })}
            options={STATUS_OPTIONS}
          />
          {fieldErrors.status && <p className="text-xs text-admin-danger">{fieldErrors.status}</p>}
        </div>
      </AdminModal>

      <AdminModal
        open={deleteOpen}
        onClose={() => {
          if (deleting) return;
          setDeleteOpen(false);
          setDeletingCategory(null);
        }}
        title="Delete Category"
        footer={
          <ModalFooter
            onCancel={() => {
              if (deleting) return;
              setDeleteOpen(false);
              setDeletingCategory(null);
            }}
            onConfirm={() => void handleDelete()}
            confirmLabel="Delete"
            loading={deleting}
          />
        }
      >
        <p className={`text-sm ${dark ? "text-white/70" : "text-admin-text/80"}`}>
          Are you sure you want to delete{" "}
          <span className="font-medium">{deletingCategory?.name}</span>? This action cannot be undone.
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
