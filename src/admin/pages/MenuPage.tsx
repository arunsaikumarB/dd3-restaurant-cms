import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, UtensilsCrossed } from "lucide-react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import DataTable from "../components/shared/DataTable";
import ActionMenu from "../components/shared/ActionMenu";
import AdminBadge from "../components/ui/Badge";
import AdminModal, { ModalFooter } from "../components/ui/Modal";
import AdminDrawer from "../components/ui/Drawer";
import AdminInput from "../components/ui/Input";
import AdminTextarea from "../components/ui/Textarea";
import AdminSelect from "../components/ui/Select";
import AdminButton from "../components/ui/Button";
import AdminToggle from "../components/ui/Toggle";
import AdminToast from "../components/ui/Toast";
import ImageUploadField from "../components/settings/ImageUploadField";
import { useAdminTheme } from "../context/AdminThemeContext";
import { useLocation } from "../hooks/useLocation";
import { resolveMutationLocationId } from "../utils/resolveMutationLocation";
import { fetchMenuCategories } from "../../services/menuCategories";
import {
  availabilityLabel,
  createMenuItem,
  deleteMenuItem,
  EMPTY_MENU_ITEM_FORM,
  fetchAllMenuItems,
  fetchMenuItems,
  isMenuItemAvailable,
  rowToForm,
  toggleAvailabilityStatus,
  updateMenuItem,
  updateMenuItemStatus,
  type MenuItemForm,
  type MenuItemTableRow,
} from "../../services/menuItems";
import { uploadFile } from "../../services/storage/upload";
import type { ContentStatus } from "../../types/database";
import {
  hasValidationErrors,
  validateMenuItemForm,
  type MenuItemErrors,
} from "../../utils/validation/menuItems";

const FALLBACK_IMAGE = "/showcase/biryani.webp";

type SortOption =
  | "display_order"
  | "price_asc"
  | "price_desc"
  | "name"
  | "newest"
  | "oldest";

const SORT_OPTIONS = [
  { value: "display_order", label: "Display Order" },
  { value: "price_asc", label: "Price Low → High" },
  { value: "price_desc", label: "Price High → Low" },
  { value: "name", label: "Alphabetical" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
] as const;

const AVAILABILITY_OPTIONS = [
  { value: "active", label: "Available" },
  { value: "inactive", label: "Unavailable" },
];

const VEG_OPTIONS = [
  { value: "veg", label: "Vegetarian" },
  { value: "non-veg", label: "Non-Vegetarian" },
];

export default function MenuManagementPage() {
  const { dark } = useAdminTheme();
  const { locationId, isAllLocations, scope } = useLocation();
  const [items, setItems] = useState<MenuItemTableRow[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("display_order");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [popularFilter, setPopularFilter] = useState("all");
  const [chefFilter, setChefFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItemTableRow | null>(null);
  const [deletingItem, setDeletingItem] = useState<MenuItemTableRow | null>(null);
  const [form, setForm] = useState<MenuItemForm>(EMPTY_MENU_ITEM_FORM);
  const [fieldErrors, setFieldErrors] = useState<MenuItemErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    setToast({ open: true, message, variant });
  }, []);

  const loadMenu = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      if (isAllLocations) {
        const menuRows = await fetchAllMenuItems();
        setItems(menuRows);
        const categoryMap = new Map<string, { id: string; name: string }>();
        for (const row of menuRows) {
          if (!categoryMap.has(row.category_id)) {
            categoryMap.set(row.category_id, {
              id: row.category_id,
              name: `${row.category}${row.locationName ? ` (${row.locationName})` : ""}`,
            });
          }
        }
        setCategories([...categoryMap.values()]);
      } else {
        const [menuRows, categoryRows] = await Promise.all([
          fetchMenuItems(locationId),
          fetchMenuCategories(locationId),
        ]);
        setItems(menuRows);
        setCategories(categoryRows.map((row) => ({ id: row.id, name: row.name })));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load menu items.");
    } finally {
      setLoading(false);
    }
  }, [isAllLocations, locationId]);

  useEffect(() => {
    void loadMenu();
  }, [loadMenu]);

  useEffect(() => {
    setSearch("");
    setCategoryFilter("all");
    setTypeFilter("all");
    setPopularFilter("all");
    setChefFilter("all");
    setStatusFilter("all");
    setAddOpen(false);
    setEditOpen(false);
    setDeleteOpen(false);
    setEditItem(null);
    setDeletingItem(null);
  }, [scope]);

  const categoryOptions = useMemo(
    () => [{ value: "all", label: "All Categories" }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    [categories],
  );

  const categorySelectOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories],
  );

  const filteredItems = useMemo(() => {
    let result = [...items];
    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query),
      );
    }

    if (categoryFilter !== "all") {
      result = result.filter((item) => item.category_id === categoryFilter);
    }

    if (typeFilter === "veg") {
      result = result.filter((item) => item.veg);
    } else if (typeFilter === "non-veg") {
      result = result.filter((item) => !item.veg);
    }

    if (popularFilter === "popular") {
      result = result.filter((item) => item.popular);
    } else if (popularFilter === "not-popular") {
      result = result.filter((item) => !item.popular);
    }

    if (chefFilter === "chef") {
      result = result.filter((item) => item.chefSpecial);
    } else if (chefFilter === "not-chef") {
      result = result.filter((item) => !item.chefSpecial);
    }

    if (statusFilter === "active") {
      result = result.filter((item) => isMenuItemAvailable(item.status));
    } else if (statusFilter === "inactive") {
      result = result.filter((item) => !isMenuItemAvailable(item.status));
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "price_asc":
          return a.price - b.price;
        case "price_desc":
          return b.price - a.price;
        case "name":
          return a.name.localeCompare(b.name);
        case "newest":
          return b.created_at.localeCompare(a.created_at);
        case "oldest":
          return a.created_at.localeCompare(b.created_at);
        case "display_order":
        default:
          return a.display_order - b.display_order || a.name.localeCompare(b.name);
      }
    });

    return result;
  }, [items, search, sortBy, categoryFilter, typeFilter, popularFilter, chefFilter, statusFilter]);

  const openAddModal = () => {
    if (isAllLocations) {
      showToast("Select a single location in the header to add menu items.", "error");
      return;
    }
    setForm({
      ...EMPTY_MENU_ITEM_FORM,
      display_order: items.length,
      category_id: categories[0]?.id ?? "",
    });
    setFieldErrors({});
    setAddOpen(true);
  };

  const openEditDrawer = (item: MenuItemTableRow) => {
    if (isAllLocations) {
      showToast("Select a single location in the header to edit menu items.", "error");
      return;
    }
    setEditItem(item);
    setForm(rowToForm(item));
    setFieldErrors({});
    setEditOpen(true);
  };

  const closeAddModal = () => {
    if (submitting) return;
    setAddOpen(false);
    setFieldErrors({});
  };

  const closeEditDrawer = () => {
    if (submitting) return;
    setEditOpen(false);
    setEditItem(null);
    setFieldErrors({});
  };

  const uploadMenuImage = async (file: File) => {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `items/${crypto.randomUUID()}.${ext}`;
    const { publicUrl } = await uploadFile({
      bucket: "menu-images",
      file,
      path,
      upsert: true,
    });
    return publicUrl;
  };

  const handleSave = async (mode: "add" | "edit") => {
    if (submitting) return;
    if (isAllLocations) {
      showToast("Select a single location in the header to save menu items.", "error");
      return;
    }

    const errors = validateMenuItemForm(form);
    setFieldErrors(errors);
    if (hasValidationErrors(errors)) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "edit" && editItem) {
        const mutationLocationId = resolveMutationLocationId(scope, locationId, editItem.location_id);
        if (!mutationLocationId) {
          showToast("Select a single location in the header to edit menu items.", "error");
          return;
        }
        await updateMenuItem(editItem.id, form, mutationLocationId);
        showToast("Menu item updated successfully.");
        setEditOpen(false);
        setEditItem(null);
      } else {
        await createMenuItem(form, locationId);
        showToast("Menu item created successfully.");
        setAddOpen(false);
      }
      setFieldErrors({});
      await loadMenu();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save menu item.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (item: MenuItemTableRow) => {
    if (isAllLocations) {
      showToast("Select a single location in the header to delete menu items.", "error");
      return;
    }
    setDeletingItem(item);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingItem || deleting) return;

    setDeleting(true);
    try {
      const mutationLocationId = resolveMutationLocationId(
        scope,
        locationId,
        deletingItem.location_id,
      );
      if (!mutationLocationId) {
        showToast("Select a single location in the header to delete menu items.", "error");
        return;
      }
      await deleteMenuItem(deletingItem.id, mutationLocationId);
      showToast("Menu item deleted successfully.");
      setDeleteOpen(false);
      setDeletingItem(null);
      await loadMenu();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete menu item.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleAvailability = async (item: MenuItemTableRow) => {
    if (togglingId) return;
    const mutationLocationId = resolveMutationLocationId(scope, locationId, item.location_id);
    if (!mutationLocationId) {
      showToast("Select a single location in the header to update menu items.", "error");
      return;
    }

    const nextStatus = toggleAvailabilityStatus(item.status);
    setTogglingId(item.id);
    try {
      const updated = await updateMenuItemStatus(item.id, nextStatus, mutationLocationId);
      setItems((prev) =>
        prev.map((row) =>
          row.id === item.id ? { ...row, status: updated.status } : row,
        ),
      );
      showToast(`Item marked as ${availabilityLabel(updated.status).toLowerCase()}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update availability.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const columns = useMemo(() => {
    const base = [
      {
        key: "image",
        label: "Image",
        render: (row: MenuItemTableRow) => (
          <img
            src={row.image ?? FALLBACK_IMAGE}
            alt=""
            className="h-10 w-10 rounded-lg object-cover"
          />
        ),
      },
      { key: "name", label: "Name" },
      ...(isAllLocations
        ? [{ key: "locationName", label: "Location" }]
        : []),
      { key: "category", label: "Category" },
    {
      key: "price",
      label: "Price",
      render: (row: MenuItemTableRow) => `$${row.price.toFixed(2)}`,
    },
    {
      key: "status",
      label: "Status",
      render: (row: MenuItemTableRow) => (
        <AdminBadge variant={isMenuItemAvailable(row.status) ? "success" : "outline"}>
          {availabilityLabel(row.status)}
        </AdminBadge>
      ),
    },
    {
      key: "vegType",
      label: "Type",
      render: (row: MenuItemTableRow) => (
        <AdminBadge variant={row.vegType === "veg" ? "success" : "danger"}>
          {row.vegType === "veg" ? "Veg" : "Non-Veg"}
        </AdminBadge>
      ),
    },
    {
      key: "badges",
      label: "Badges",
      render: (row: MenuItemTableRow) => (
        <div className="flex flex-wrap gap-1">
          {row.popular && <AdminBadge variant="info">Popular</AdminBadge>}
          {row.chefSpecial && <AdminBadge variant="warning">Chef&apos;s Special</AdminBadge>}
          {row.importedFromChefGaa && (
            <AdminBadge variant={row.manualOverride ? "outline" : "success"}>
              {row.manualOverride ? "🔒 Locked" : "ChefGaa Synced"}
            </AdminBadge>
          )}
        </div>
      ),
    },
    {
      key: "available",
      label: "Available",
      render: (row: MenuItemTableRow) => (
        <AdminToggle
          checked={isMenuItemAvailable(row.status)}
          onChange={() => void handleToggleAvailability(row)}
          label={isMenuItemAvailable(row.status) ? "Yes" : "No"}
        />
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row: MenuItemTableRow) => (
        <ActionMenu
          onEdit={() => openEditDrawer(row)}
          onDelete={() => openDeleteModal(row)}
        />
      ),
    },
    ];
    return base;
  }, [isAllLocations, togglingId, dark]);

  if (loadError) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Menu" }]} />
        <PageHeader
          title="Menu Management"
          description="Manage dishes, pricing, and availability."
          actionLabel="Add Item"
          onAction={openAddModal}
        />
        <div className={`rounded-2xl border p-6 ${dark ? "border-admin-border-dark" : "border-admin-border"}`}>
          <p className="text-sm text-admin-danger">{loadError}</p>
          <div className="mt-4">
            <AdminButton type="button" onClick={() => void loadMenu()}>
              Retry
            </AdminButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Menu" }]} />
      <PageHeader
        title="Menu Management"
        description="Manage dishes, pricing, and availability."
        actionLabel="Add Item"
        onAction={openAddModal}
      />

      <div className="mb-6 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search
              size={16}
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-admin-muted"}`}
            />
            <input
              type="search"
              placeholder="Search menu items..."
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
            <AdminSelect value={sortBy} onChange={(v) => setSortBy(v as SortOption)} options={[...SORT_OPTIONS]} />
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap">
          <div className="w-full sm:w-44">
            <AdminSelect value={categoryFilter} onChange={setCategoryFilter} options={categoryOptions} />
          </div>
          <div className="w-full sm:w-40">
            <AdminSelect
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "all", label: "All Types" },
                { value: "veg", label: "Veg" },
                { value: "non-veg", label: "Non-Veg" },
              ]}
            />
          </div>
          <div className="w-full sm:w-40">
            <AdminSelect
              value={popularFilter}
              onChange={setPopularFilter}
              options={[
                { value: "all", label: "All Items" },
                { value: "popular", label: "Popular" },
                { value: "not-popular", label: "Not Popular" },
              ]}
            />
          </div>
          <div className="w-full sm:w-44">
            <AdminSelect
              value={chefFilter}
              onChange={setChefFilter}
              options={[
                { value: "all", label: "All Items" },
                { value: "chef", label: "Chef Special" },
                { value: "not-chef", label: "Not Chef Special" },
              ]}
            />
          </div>
          <div className="w-full sm:w-44">
            <AdminSelect
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All Availability" },
                { value: "active", label: "Available" },
                { value: "inactive", label: "Unavailable" },
              ]}
            />
          </div>
        </div>
      </div>

      <DataTable
        data={filteredItems as unknown as Record<string, unknown>[]}
        columns={columns as never}
        hideToolbar
        loading={loading}
        pageSize={6}
        emptyIcon={UtensilsCrossed}
        emptyTitle="No menu items"
        emptyDescription="Add your first dish to get started."
        onCreateClick={openAddModal}
        createLabel="Add Item"
      />

      <AdminModal
        open={addOpen}
        onClose={closeAddModal}
        title="Add Menu Item"
        size="lg"
        footer={
          <ModalFooter
            onCancel={closeAddModal}
            onConfirm={() => void handleSave("add")}
            confirmLabel="Add Item"
            loading={submitting}
          />
        }
      >
        <MenuForm
          form={form}
          fieldErrors={fieldErrors}
          categoryOptions={categorySelectOptions}
          disabled={submitting}
          onPatch={setForm}
          onUpload={uploadMenuImage}
        />
      </AdminModal>

      <AdminDrawer
        open={editOpen}
        onClose={closeEditDrawer}
        title="Edit Menu Item"
        footer={
          <>
            <AdminButton type="button" variant="outline" disabled={submitting} onClick={closeEditDrawer}>
              Cancel
            </AdminButton>
            <AdminButton type="button" disabled={submitting} onClick={() => void handleSave("edit")}>
              {submitting ? "Saving…" : "Save Changes"}
            </AdminButton>
          </>
        }
      >
        <MenuForm
          form={form}
          fieldErrors={fieldErrors}
          categoryOptions={categorySelectOptions}
          disabled={submitting}
          onPatch={setForm}
          onUpload={uploadMenuImage}
        />
      </AdminDrawer>

      <AdminModal
        open={deleteOpen}
        onClose={() => {
          if (deleting) return;
          setDeleteOpen(false);
          setDeletingItem(null);
        }}
        title="Delete Menu Item"
        footer={
          <ModalFooter
            onCancel={() => {
              if (deleting) return;
              setDeleteOpen(false);
              setDeletingItem(null);
            }}
            onConfirm={() => void handleDelete()}
            confirmLabel="Delete"
            loading={deleting}
          />
        }
      >
        <p className={`text-sm ${dark ? "text-white/70" : "text-admin-text/80"}`}>
          Are you sure you want to delete{" "}
          <span className="font-medium">{deletingItem?.name}</span>? This action cannot be undone.
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

interface MenuFormProps {
  form: MenuItemForm;
  fieldErrors: MenuItemErrors;
  categoryOptions: { value: string; label: string }[];
  disabled?: boolean;
  onPatch: (updater: (prev: MenuItemForm) => MenuItemForm) => void;
  onUpload: (file: File) => Promise<string>;
}

function MenuForm({ form, fieldErrors, categoryOptions, disabled, onPatch, onUpload }: MenuFormProps) {
  const patch = (partial: Partial<MenuItemForm>) => {
    onPatch((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="space-y-4">
      <AdminInput
        label="Item Name"
        placeholder="Chicken Dum Biryani"
        value={form.name}
        error={fieldErrors.name}
        disabled={disabled}
        onChange={(e) => patch({ name: e.target.value })}
      />
      <AdminSelect
        label="Category"
        value={form.category_id}
        onChange={(value) => patch({ category_id: value })}
        options={categoryOptions}
        placeholder="Select category"
      />
      {fieldErrors.category_id && <p className="text-xs text-admin-danger">{fieldErrors.category_id}</p>}
      <AdminTextarea
        label="Description"
        value={form.description}
        disabled={disabled}
        onChange={(e) => patch({ description: e.target.value })}
      />
      <AdminInput
        label="Price"
        type="number"
        min={0}
        step="0.01"
        value={String(form.price)}
        error={fieldErrors.price}
        disabled={disabled}
        placeholder="16.99"
        onChange={(e) => {
          const parsed = Number(e.target.value);
          patch({ price: Number.isFinite(parsed) ? parsed : 0 });
        }}
      />
      <ImageUploadField
        label="Item Image"
        value={form.image}
        disabled={disabled}
        onChange={(url) => patch({ image: url || null })}
        onUpload={onUpload}
      />
      <AdminSelect
        label="Availability Status"
        value={form.status}
        onChange={(value) => patch({ status: value as ContentStatus })}
        options={AVAILABILITY_OPTIONS}
      />
      {fieldErrors.status && <p className="text-xs text-admin-danger">{fieldErrors.status}</p>}
      <AdminSelect
        label="Veg / Non-Veg"
        value={form.veg ? "veg" : "non-veg"}
        onChange={(value) => patch({ veg: value === "veg" })}
        options={VEG_OPTIONS}
      />
      <AdminInput
        label="Spice Level"
        type="number"
        min={0}
        max={5}
        value={form.spice_level === null ? "" : String(form.spice_level)}
        error={fieldErrors.spice_level}
        disabled={disabled}
        placeholder="0–5 (optional)"
        onChange={(e) => {
          const raw = e.target.value;
          if (!raw.trim()) {
            patch({ spice_level: null });
            return;
          }
          const parsed = Number(raw);
          patch({ spice_level: Number.isFinite(parsed) ? parsed : null });
        }}
      />
      <AdminInput
        label="Display Order"
        type="number"
        min={0}
        value={String(form.display_order)}
        error={fieldErrors.display_order}
        disabled={disabled}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          patch({ display_order: Number.isFinite(parsed) ? parsed : 0 });
        }}
      />
      <div className="flex gap-6">
        <AdminToggle
          checked={form.popular}
          onChange={(checked) => patch({ popular: checked })}
          label="Popular"
        />
        <AdminToggle
          checked={form.chef_special}
          onChange={(checked) => patch({ chef_special: checked })}
          label="Chef's Special"
        />
      </div>
      <div>
        <AdminToggle
          checked={form.manual_override}
          onChange={(checked) => patch({ manual_override: checked })}
          label="Lock this item"
        />
        <p className="mt-1.5 text-xs text-admin-muted">
          For items imported from ChefGaa: locking prevents the next automatic sync from
          overwriting anything you edit here (name, price, image, Popular, Chef&apos;s Special,
          etc.). Unlock to let ChefGaa resume controlling this item.
        </p>
      </div>
    </div>
  );
}
