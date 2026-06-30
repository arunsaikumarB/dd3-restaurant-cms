import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, Tag } from "lucide-react";
import { motion } from "framer-motion";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import StatusChip from "../components/shared/StatusChip";
import AdminCard from "../components/ui/Card";
import AdminToggle from "../components/ui/Toggle";
import ActionMenu from "../components/shared/ActionMenu";
import AdminModal, { ModalFooter } from "../components/ui/Modal";
import AdminInput from "../components/ui/Input";
import AdminTextarea from "../components/ui/Textarea";
import AdminSelect from "../components/ui/Select";
import AdminButton from "../components/ui/Button";
import AdminBadge from "../components/ui/Badge";
import AdminToast from "../components/ui/Toast";
import ImageUploadField from "../components/settings/ImageUploadField";
import OffersPageSkeleton from "../components/settings/OffersPageSkeleton";
import { useAdminTheme } from "../context/AdminThemeContext";
import { useLocation } from "../hooks/useLocation";
import {
  createOffer,
  deleteOffer,
  EMPTY_OFFER_FORM,
  fetchAllOffers,
  fetchOffers,
  rowToForm,
  scheduleStatusLabel,
  scheduleStatusVariant,
  updateOffer,
  updateOfferActive,
  type OfferCardRow,
  type OfferForm,
} from "../../services/offers";
import { uploadFile } from "../../services/storage/upload";
import type { OfferScheduleStatus } from "../../utils/offers/schedule";
import {
  hasValidationErrors,
  validateOfferForm,
  type OfferErrors,
} from "../../utils/validation/offers";

const FALLBACK_BANNER = "/showcase/biryani.jpg";

type SortOption = "newest" | "oldest" | "start_date" | "end_date" | "alphabetical";
type FilterOption = "all" | "active" | "inactive" | "current" | "expired" | "upcoming";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "start_date", label: "Start Date" },
  { value: "end_date", label: "End Date" },
  { value: "alphabetical", label: "Alphabetical" },
] as const;

const FILTER_OPTIONS = [
  { value: "all", label: "All Offers" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "current", label: "Current" },
  { value: "upcoming", label: "Upcoming" },
  { value: "expired", label: "Expired" },
];

export default function OffersPage() {
  const { dark } = useAdminTheme();
  const { locationId, isAllLocations, scope } = useLocation();
  const [offers, setOffers] = useState<OfferCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingOffer, setDeletingOffer] = useState<OfferCardRow | null>(null);
  const [form, setForm] = useState<OfferForm>(EMPTY_OFFER_FORM);
  const [fieldErrors, setFieldErrors] = useState<OfferErrors>({});
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

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = isAllLocations ? await fetchAllOffers() : await fetchOffers(locationId);
      setOffers(rows);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load offers.");
    } finally {
      setLoading(false);
    }
  }, [isAllLocations, locationId]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  useEffect(() => {
    setSearch("");
    setFilterBy("all");
    setModalOpen(false);
    setDeleteOpen(false);
    setEditingId(null);
    setDeletingOffer(null);
  }, [scope]);

  const filteredOffers = useMemo(() => {
    let result = [...offers];
    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (offer) =>
          offer.title.toLowerCase().includes(query) ||
          offer.description.toLowerCase().includes(query),
      );
    }

    if (filterBy === "active") {
      result = result.filter((offer) => offer.active);
    } else if (filterBy === "inactive") {
      result = result.filter((offer) => !offer.active);
    } else if (filterBy === "current" || filterBy === "upcoming" || filterBy === "expired") {
      result = result.filter((offer) => offer.scheduleStatus === filterBy);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return a.created_at.localeCompare(b.created_at);
        case "start_date":
          return b.start_date.localeCompare(a.start_date);
        case "end_date":
          return b.end_date.localeCompare(a.end_date);
        case "alphabetical":
          return a.title.localeCompare(b.title);
        case "newest":
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });

    return result;
  }, [offers, search, sortBy, filterBy]);

  const openCreateModal = () => {
    if (isAllLocations) {
      showToast("Select a single location in the header to create offers.", "error");
      return;
    }
    setEditingId(null);
    setForm({ ...EMPTY_OFFER_FORM });
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEditModal = (offer: OfferCardRow) => {
    setEditingId(offer.id);
    setForm(rowToForm(offer));
    setFieldErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditingId(null);
    setFieldErrors({});
  };

  const uploadBanner = async (file: File) => {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `banners/${crypto.randomUUID()}.${ext}`;
    const { publicUrl } = await uploadFile({
      bucket: "offer-images",
      file,
      path,
      upsert: true,
    });
    return publicUrl;
  };

  const handleSave = async () => {
    if (submitting) return;

    const errors = validateOfferForm(form);
    setFieldErrors(errors);
    if (hasValidationErrors(errors)) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateOffer(editingId, form);
        showToast("Offer updated successfully.");
      } else {
        await createOffer(form, locationId);
        showToast("Offer created successfully.");
      }
      setModalOpen(false);
      setEditingId(null);
      setFieldErrors({});
      await loadOffers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save offer.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (offer: OfferCardRow) => {
    setDeletingOffer(offer);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingOffer || deleting) return;

    setDeleting(true);
    try {
      await deleteOffer(deletingOffer.id);
      showToast("Offer deleted successfully.");
      setDeleteOpen(false);
      setDeletingOffer(null);
      await loadOffers();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete offer.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (offer: OfferCardRow) => {
    if (togglingId) return;

    const nextActive = !offer.active;
    setTogglingId(offer.id);
    try {
      const updated = await updateOfferActive(offer.id, nextActive);
      setOffers((prev) =>
        prev.map((row) => (row.id === offer.id ? updated : row)),
      );
      showToast(`Offer marked as ${nextActive ? "active" : "inactive"}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update offer status.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Offers" }]} />
        <PageHeader
          title="Offers & Promotions"
          description="Create and manage special deals and discounts."
          actionLabel="Create Offer"
          onAction={openCreateModal}
        />
        <OffersPageSkeleton />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Offers" }]} />
        <PageHeader
          title="Offers & Promotions"
          description="Create and manage special deals and discounts."
          actionLabel="Create Offer"
          onAction={openCreateModal}
        />
        <AdminCard>
          <p className="text-sm text-admin-danger">{loadError}</p>
          <div className="mt-4">
            <AdminButton type="button" onClick={() => void loadOffers()}>
              Retry
            </AdminButton>
          </div>
        </AdminCard>
      </div>
    );
  }

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Offers" }]} />
      <PageHeader
        title="Offers & Promotions"
        description="Create and manage special deals and discounts."
        actionLabel="Create Offer"
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
            placeholder="Search offers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={[
              "h-10 w-full rounded-xl border pl-9 pr-3 text-sm",
              "focus:outline-none focus:ring-2 focus:ring-admin-orange/30",
              dark ? "border-admin-border-dark bg-white/5 text-white" : "border-admin-border bg-white",
            ].join(" ")}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="w-44">
            <AdminSelect value={filterBy} onChange={(v) => setFilterBy(v as FilterOption)} options={FILTER_OPTIONS} />
          </div>
          <div className="w-44">
            <AdminSelect value={sortBy} onChange={(v) => setSortBy(v as SortOption)} options={[...SORT_OPTIONS]} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {filteredOffers.map((offer, i) => (
          <motion.div
            key={offer.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <AdminCard className="overflow-hidden p-0">
              <div className="relative h-40">
                <img
                  src={offer.banner ?? FALLBACK_BANNER}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <span className="rounded-full bg-admin-gold px-3 py-1 text-sm font-bold text-white">
                    {offer.discount}
                  </span>
                  <h3 className="mt-2 text-xl font-semibold text-white">{offer.name}</h3>
                  {isAllLocations && offer.locationName ? (
                    <p className="mt-1 text-xs text-white/70">{offer.locationName}</p>
                  ) : null}
                </div>
                <div className="absolute right-3 top-3">
                  <ActionMenu
                    onEdit={() => openEditModal(offer)}
                    onDelete={() => openDeleteModal(offer)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-5">
                <div>
                  <p className={`text-xs ${dark ? "text-white/40" : "text-admin-muted"}`}>
                    {offer.startDate} — {offer.endDate}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusChip status={offer.status} />
                    <ScheduleBadge status={offer.scheduleStatus} />
                  </div>
                </div>
                <AdminToggle
                  checked={offer.active}
                  onChange={() => void handleToggleActive(offer)}
                  label={offer.active ? "Active" : "Inactive"}
                />
              </div>
            </AdminCard>
          </motion.div>
        ))}
      </div>

      {filteredOffers.length === 0 && (
        <AdminCard>
          <div className="flex flex-col items-center py-12">
            <Tag size={32} className="text-admin-muted" />
            <p className="mt-3 text-sm">
              {offers.length === 0 ? "No offers yet" : "No offers match your search or filters"}
            </p>
          </div>
        </AdminCard>
      )}

      <AdminModal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Offer" : "Create Offer"}
        size="lg"
        footer={
          <ModalFooter
            onCancel={closeModal}
            onConfirm={() => void handleSave()}
            confirmLabel={editingId ? "Save Changes" : "Create Offer"}
            loading={submitting}
          />
        }
      >
        <OfferForm
          form={form}
          fieldErrors={fieldErrors}
          disabled={submitting}
          onPatch={setForm}
          onUpload={uploadBanner}
        />
      </AdminModal>

      <AdminModal
        open={deleteOpen}
        onClose={() => {
          if (deleting) return;
          setDeleteOpen(false);
          setDeletingOffer(null);
        }}
        title="Delete Offer"
        footer={
          <ModalFooter
            onCancel={() => {
              if (deleting) return;
              setDeleteOpen(false);
              setDeletingOffer(null);
            }}
            onConfirm={() => void handleDelete()}
            confirmLabel="Delete"
            loading={deleting}
          />
        }
      >
        <p className={`text-sm ${dark ? "text-white/70" : "text-admin-text/80"}`}>
          Are you sure you want to delete{" "}
          <span className="font-medium">{deletingOffer?.title}</span>? This action cannot be undone.
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

function ScheduleBadge({ status }: { status: OfferScheduleStatus }) {
  return (
    <AdminBadge variant={scheduleStatusVariant(status)}>
      {scheduleStatusLabel(status)}
    </AdminBadge>
  );
}

interface OfferFormProps {
  form: OfferForm;
  fieldErrors: OfferErrors;
  disabled?: boolean;
  onPatch: (updater: (prev: OfferForm) => OfferForm) => void;
  onUpload: (file: File) => Promise<string>;
}

function OfferForm({ form, fieldErrors, disabled, onPatch, onUpload }: OfferFormProps) {
  const patch = (partial: Partial<OfferForm>) => {
    onPatch((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="space-y-4">
      <AdminInput
        label="Offer Title"
        placeholder="Weekend Biryani Special"
        value={form.title}
        error={fieldErrors.title}
        disabled={disabled}
        onChange={(e) => patch({ title: e.target.value })}
      />
      <AdminTextarea
        label="Description"
        value={form.description}
        disabled={disabled}
        onChange={(e) => patch({ description: e.target.value })}
      />
      <ImageUploadField
        label="Banner Image"
        value={form.banner}
        disabled={disabled}
        onChange={(url) => patch({ banner: url || null })}
        onUpload={onUpload}
      />
      <AdminInput
        label="Discount"
        placeholder="15% OFF"
        value={form.discount}
        error={fieldErrors.discount}
        disabled={disabled}
        onChange={(e) => patch({ discount: e.target.value })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminInput
          label="Start Date"
          type="date"
          value={form.start_date}
          error={fieldErrors.start_date}
          disabled={disabled}
          onChange={(e) => patch({ start_date: e.target.value })}
        />
        <AdminInput
          label="End Date"
          type="date"
          value={form.end_date}
          error={fieldErrors.end_date}
          disabled={disabled}
          onChange={(e) => patch({ end_date: e.target.value })}
        />
      </div>
      <AdminToggle
        checked={form.active}
        onChange={(checked) => patch({ active: checked })}
        label={form.active ? "Active" : "Inactive"}
      />
    </div>
  );
}
