import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Search, Tag, Trash2, X } from "lucide-react";
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
import OffersPageSkeleton from "../components/settings/OffersPageSkeleton";
import { useAdminTheme } from "../context/AdminThemeContext";
import { useLocation } from "../hooks/useLocation";
import { resolveMutationLocationId } from "../utils/resolveMutationLocation";
import {
  createOffer,
  deleteOffer,
  EMPTY_OFFER_CONTENT_SECTION,
  EMPTY_OFFER_FORM,
  fetchAllOffers,
  fetchOfferById,
  fetchOffers,
  offerRowToForm,
  scheduleStatusLabel,
  scheduleStatusVariant,
  updateOffer,
  updateOfferActive,
  updateOfferFeatured,
  type OfferCardRow,
  type OfferForm,
} from "../../services/offers";
import { invalidatePublicOffersCache } from "../../services/offersPublic";
import type { OfferContentSection } from "../../data/offers/types";
import type { OfferScheduleStatus } from "../../utils/offers/schedule";
import {
  hasValidationErrors,
  slugifyTitle,
  validateOfferForm,
  type OfferErrors,
} from "../../utils/validation/offers";

const FALLBACK_IMAGE = "/showcase/biryani.jpg";

type SortOption =
  | "display_order"
  | "newest"
  | "oldest"
  | "start_date"
  | "end_date"
  | "alphabetical";
type FilterOption = "all" | "active" | "inactive" | "current" | "expired" | "upcoming" | "featured";

const SORT_OPTIONS = [
  { value: "display_order", label: "Display Order" },
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
  { value: "featured", label: "Featured" },
  { value: "current", label: "Current" },
  { value: "upcoming", label: "Upcoming" },
  { value: "expired", label: "Expired" },
];

export default function OffersManagementPage() {
  const { dark } = useAdminTheme();
  const { locationId, isAllLocations, scope } = useLocation();
  const [offers, setOffers] = useState<OfferCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("display_order");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingOffer, setDeletingOffer] = useState<OfferCardRow | null>(null);
  const [form, setForm] = useState<OfferForm>(EMPTY_OFFER_FORM);
  const [fieldErrors, setFieldErrors] = useState<OfferErrors>({});
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState<string | null>(null);
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
          offer.description.toLowerCase().includes(query) ||
          offer.slug.toLowerCase().includes(query) ||
          offer.badge.toLowerCase().includes(query),
      );
    }

    if (filterBy === "active") {
      result = result.filter((offer) => offer.active);
    } else if (filterBy === "inactive") {
      result = result.filter((offer) => !offer.active);
    } else if (filterBy === "featured") {
      result = result.filter((offer) => offer.featured);
    } else if (filterBy === "current" || filterBy === "upcoming" || filterBy === "expired") {
      result = result.filter((offer) => offer.scheduleStatus === filterBy);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "display_order":
          if (a.display_order !== b.display_order) return a.display_order - b.display_order;
          return a.title.localeCompare(b.title);
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
    setForm({ ...EMPTY_OFFER_FORM, content: [{ ...EMPTY_OFFER_CONTENT_SECTION }] });
    setFieldErrors({});
    setSlugManuallyEdited(false);
    setFormLoading(false);
    setModalOpen(true);
  };

  const openEditModal = async (offer: OfferCardRow) => {
    if (isAllLocations) {
      showToast("Select a single location in the header to edit offers.", "error");
      return;
    }

    const mutationLocationId = resolveMutationLocationId(scope, locationId, offer.location_id);
    if (!mutationLocationId) {
      showToast("Select a single location in the header to edit offers.", "error");
      return;
    }

    setEditingId(offer.id);
    setFieldErrors({});
    setSlugManuallyEdited(true);
    setFormLoading(true);
    setModalOpen(true);

    try {
      const full = await fetchOfferById(offer.id, mutationLocationId);
      if (full) {
        setForm(offerRowToForm(full));
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load offer details.", "error");
      setModalOpen(false);
      setEditingId(null);
    } finally {
      setFormLoading(false);
    }
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditingId(null);
    setFieldErrors({});
    setFormLoading(false);
  };

  const handleSave = async () => {
    if (submitting || formLoading) return;
    if (isAllLocations) {
      showToast("Select a single location in the header to save offers.", "error");
      return;
    }

    const errors = validateOfferForm(form);
    setFieldErrors(errors);
    if (hasValidationErrors(errors)) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        const editingOffer = offers.find((row) => row.id === editingId);
        const mutationLocationId = resolveMutationLocationId(
          scope,
          locationId,
          editingOffer?.location_id,
        );
        if (!mutationLocationId) {
          showToast("Select a single location in the header to edit offers.", "error");
          return;
        }
        await updateOffer(editingId, form, mutationLocationId);
        invalidatePublicOffersCache(mutationLocationId);
        showToast("Offer updated successfully.");
      } else {
        await createOffer(form, locationId);
        invalidatePublicOffersCache(locationId);
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
    if (isAllLocations) {
      showToast("Select a single location in the header to delete offers.", "error");
      return;
    }
    setDeletingOffer(offer);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingOffer || deleting) return;

    setDeleting(true);
    try {
      const mutationLocationId = resolveMutationLocationId(
        scope,
        locationId,
        deletingOffer.location_id,
      );
      if (!mutationLocationId) {
        showToast("Select a single location in the header to delete offers.", "error");
        return;
      }
      await deleteOffer(deletingOffer.id, mutationLocationId);
      invalidatePublicOffersCache(mutationLocationId);
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
    const mutationLocationId = resolveMutationLocationId(scope, locationId, offer.location_id);
    if (!mutationLocationId) {
      showToast("Select a single location in the header to update offers.", "error");
      return;
    }

    const nextActive = !offer.active;
    setTogglingId(offer.id);
    try {
      const updated = await updateOfferActive(offer.id, nextActive, mutationLocationId);
      setOffers((prev) => prev.map((row) => (row.id === offer.id ? updated : row)));
      invalidatePublicOffersCache(mutationLocationId);
      showToast(`Offer marked as ${nextActive ? "active" : "inactive"}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update offer status.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleFeatured = async (offer: OfferCardRow) => {
    if (togglingFeaturedId) return;
    const mutationLocationId = resolveMutationLocationId(scope, locationId, offer.location_id);
    if (!mutationLocationId) {
      showToast("Select a single location in the header to update offers.", "error");
      return;
    }

    const nextFeatured = !offer.featured;
    setTogglingFeaturedId(offer.id);
    try {
      const updated = await updateOfferFeatured(offer.id, nextFeatured, mutationLocationId);
      setOffers((prev) => prev.map((row) => (row.id === offer.id ? updated : row)));
      invalidatePublicOffersCache(mutationLocationId);
      showToast(`Offer marked as ${nextFeatured ? "featured" : "not featured"}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update featured status.", "error");
    } finally {
      setTogglingFeaturedId(null);
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
                  src={offer.image ?? FALLBACK_IMAGE}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  {offer.badge ? (
                    <span className="rounded-full bg-admin-gold px-3 py-1 text-sm font-bold text-white">
                      {offer.badge}
                    </span>
                  ) : null}
                  <h3 className="mt-2 text-xl font-semibold text-white">{offer.name}</h3>
                  {offer.featured ? (
                    <span className="mt-1 inline-block rounded bg-white/20 px-2 py-0.5 text-xs text-white">
                      Featured
                    </span>
                  ) : null}
                  {isAllLocations && offer.locationName ? (
                    <p className="mt-1 text-xs text-white/70">{offer.locationName}</p>
                  ) : null}
                </div>
                <div className="absolute right-3 top-3">
                  <ActionMenu
                    onEdit={() => void openEditModal(offer)}
                    onDelete={() => openDeleteModal(offer)}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <p className={`text-xs ${dark ? "text-white/40" : "text-admin-muted"}`}>
                    {offer.validUntil || "No availability set"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <StatusChip status={offer.status} />
                    <ScheduleBadge status={offer.scheduleStatus} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-3">
                  <AdminToggle
                    checked={offer.featured}
                    onChange={() => void handleToggleFeatured(offer)}
                    label={offer.featured ? "Featured" : "Not Featured"}
                  />
                  <AdminToggle
                    checked={offer.active}
                    onChange={() => void handleToggleActive(offer)}
                    label={offer.active ? "Active" : "Inactive"}
                  />
                </div>
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
        {formLoading ? (
          <p className={`text-sm ${dark ? "text-white/60" : "text-admin-muted"}`}>Loading offer details…</p>
        ) : (
          <OfferFormFields
            form={form}
            fieldErrors={fieldErrors}
            disabled={submitting}
            slugManuallyEdited={slugManuallyEdited}
            onSlugManuallyEdited={setSlugManuallyEdited}
            onPatch={setForm}
          />
        )}
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

interface OfferFormFieldsProps {
  form: OfferForm;
  fieldErrors: OfferErrors;
  disabled?: boolean;
  slugManuallyEdited: boolean;
  onSlugManuallyEdited: (value: boolean) => void;
  onPatch: (updater: (prev: OfferForm) => OfferForm) => void;
}

function OfferFormFields({
  form,
  fieldErrors,
  disabled,
  slugManuallyEdited,
  onSlugManuallyEdited,
  onPatch,
}: OfferFormFieldsProps) {
  const { dark } = useAdminTheme();

  const patch = (partial: Partial<OfferForm>) => {
    onPatch((prev) => ({ ...prev, ...partial }));
  };

  const handleTitleChange = (title: string) => {
    onPatch((prev) => ({
      ...prev,
      title,
      slug: slugManuallyEdited ? prev.slug : slugifyTitle(title),
    }));
  };

  return (
    <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
      <AdminInput
        label="Offer Title"
        placeholder="Weekend Biryani Special"
        value={form.title}
        error={fieldErrors.title}
        disabled={disabled}
        onChange={(e) => handleTitleChange(e.target.value)}
      />
      <AdminInput
        label="URL Slug"
        placeholder="weekend-biryani-special"
        value={form.slug}
        error={fieldErrors.slug}
        disabled={disabled}
        onChange={(e) => {
          onSlugManuallyEdited(true);
          patch({ slug: slugifyTitle(e.target.value) });
        }}
      />
      <AdminTextarea
        label="Short Description"
        value={form.description}
        disabled={disabled}
        onChange={(e) => patch({ description: e.target.value })}
      />
      <AdminInput
        label="Hero Image URL"
        placeholder="https://… or /showcase/biryani.jpg"
        value={form.image ?? ""}
        error={fieldErrors.image}
        disabled={disabled}
        onChange={(e) => patch({ image: e.target.value.trim() || null })}
      />
      {form.image ? (
        <img src={form.image} alt="" className="h-24 w-full rounded-lg object-cover" />
      ) : null}

      <GalleryUrlEditor
        urls={form.gallery}
        error={fieldErrors.gallery}
        disabled={disabled}
        onChange={(gallery) => patch({ gallery })}
        dark={dark}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminInput
          label="Badge"
          placeholder="15% OFF"
          value={form.badge}
          disabled={disabled}
          onChange={(e) => patch({ badge: e.target.value })}
        />
        <AdminInput
          label="Category Label"
          placeholder="Lunch Special"
          value={form.category}
          disabled={disabled}
          onChange={(e) => patch({ category: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <AdminInput
          label="Offer Availability"
          placeholder="Every Tuesday"
          value={form.valid_until}
          error={fieldErrors.valid_until}
          disabled={disabled}
          onChange={(e) => patch({ valid_until: e.target.value })}
        />
        <p className={`text-xs leading-relaxed ${dark ? "text-white/45" : "text-admin-muted"}`}>
          Examples: Every Tuesday · Mon–Fri, 12:00 PM – 3:00 PM · Sat & Sun, 8:00 AM – 11:00 AM ·
          Available till 2 AM · Weekend Special · Limited Time
        </p>
      </div>

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

      <div className="grid gap-4 sm:grid-cols-2">
        <AdminInput
          label="Price"
          placeholder="$12.99"
          value={form.price}
          disabled={disabled}
          onChange={(e) => patch({ price: e.target.value })}
        />
        <AdminInput
          label="Display Order"
          type="number"
          min={0}
          value={String(form.display_order)}
          error={fieldErrors.display_order}
          disabled={disabled}
          onChange={(e) => patch({ display_order: Number(e.target.value) || 0 })}
        />
      </div>

      <AdminInput
        label="Order Now Category"
        placeholder="Biryani"
        value={form.order_category}
        disabled={disabled}
        onChange={(e) => patch({ order_category: e.target.value })}
      />

      <TermsEditor
        terms={form.terms}
        disabled={disabled}
        onChange={(terms) => patch({ terms })}
        dark={dark}
      />

      <ContentSectionEditor
        sections={form.content}
        error={fieldErrors.content}
        disabled={disabled}
        onChange={(content) => patch({ content })}
        dark={dark}
      />

      <div className="flex flex-wrap gap-6">
        <AdminToggle
          checked={form.featured}
          onChange={(checked) => patch({ featured: checked })}
          label={form.featured ? "Featured" : "Not Featured"}
        />
        <AdminToggle
          checked={form.active}
          onChange={(checked) => patch({ active: checked })}
          label={form.active ? "Active" : "Inactive"}
        />
      </div>
    </div>
  );
}

function GalleryUrlEditor({
  urls,
  error,
  disabled,
  onChange,
  dark,
}: {
  urls: string[];
  error?: string;
  disabled?: boolean;
  onChange: (urls: string[]) => void;
  dark: boolean;
}) {
  const updateUrl = (index: number, value: string) => {
    const next = [...urls];
    next[index] = value;
    onChange(next);
  };

  const removeUrl = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Gallery Image URLs</p>
        <AdminButton
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange([...urls, ""])}
        >
          <Plus size={14} className="mr-1" />
          Add URL
        </AdminButton>
      </div>
      {error ? <p className="text-xs text-admin-danger">{error}</p> : null}
      {urls.length === 0 ? (
        <p className={`text-xs ${dark ? "text-white/50" : "text-admin-muted"}`}>No gallery images yet.</p>
      ) : (
        urls.map((url, index) => (
          <div key={index} className="space-y-2 rounded-xl border p-3 border-admin-border">
            <div className="flex gap-2">
              <AdminInput
                label={`Image ${index + 1}`}
                placeholder="https://…"
                value={url}
                disabled={disabled}
                onChange={(e) => updateUrl(index, e.target.value)}
              />
              <button
                type="button"
                className="mt-6 text-admin-danger"
                disabled={disabled}
                onClick={() => removeUrl(index)}
                aria-label="Remove gallery image"
              >
                <Trash2 size={16} />
              </button>
            </div>
            {url.trim() ? (
              <img src={url.trim()} alt="" className="h-20 w-full rounded-lg object-cover" />
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

function TermsEditor({
  terms,
  disabled,
  onChange,
  dark,
}: {
  terms: string[];
  disabled?: boolean;
  onChange: (terms: string[]) => void;
  dark: boolean;
}) {
  const updateTerm = (index: number, value: string) => {
    const next = [...terms];
    next[index] = value;
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Terms & Conditions</p>
        <AdminButton
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange([...terms, ""])}
        >
          <Plus size={14} className="mr-1" />
          Add Term
        </AdminButton>
      </div>
      {terms.length === 0 ? (
        <p className={`text-xs ${dark ? "text-white/50" : "text-admin-muted"}`}>No terms added.</p>
      ) : (
        terms.map((term, index) => (
          <div key={index} className="flex gap-2">
            <AdminInput
              label={`Term ${index + 1}`}
              value={term}
              disabled={disabled}
              onChange={(e) => updateTerm(index, e.target.value)}
            />
            <button
              type="button"
              className="mt-6 text-admin-danger"
              disabled={disabled}
              onClick={() => onChange(terms.filter((_, i) => i !== index))}
              aria-label="Remove term"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function ContentSectionEditor({
  sections,
  error,
  disabled,
  onChange,
  dark,
}: {
  sections: OfferContentSection[];
  error?: string;
  disabled?: boolean;
  onChange: (sections: OfferContentSection[]) => void;
  dark: boolean;
}) {
  const updateSection = (index: number, partial: Partial<OfferContentSection>) => {
    const next = sections.map((section, i) => (i === index ? { ...section, ...partial } : section));
    onChange(next);
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next);
  };

  const removeSection = (index: number) => {
    if (sections.length <= 1) return;
    onChange(sections.filter((_, i) => i !== index));
  };

  const updateParagraph = (sectionIndex: number, paragraphIndex: number, value: string) => {
    const section = sections[sectionIndex];
    const paragraphs = [...section.paragraphs];
    paragraphs[paragraphIndex] = value;
    updateSection(sectionIndex, { paragraphs });
  };

  const updateListItem = (sectionIndex: number, listIndex: number, value: string) => {
    const section = sections[sectionIndex];
    const list = [...(section.list ?? [])];
    list[listIndex] = value;
    updateSection(sectionIndex, { list });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Content Sections</p>
        <AdminButton
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => onChange([...sections, { ...EMPTY_OFFER_CONTENT_SECTION }])}
        >
          <Plus size={14} className="mr-1" />
          Add Section
        </AdminButton>
      </div>
      {error ? <p className="text-xs text-admin-danger">{error}</p> : null}

      {sections.map((section, sectionIndex) => (
        <div
          key={sectionIndex}
          className={`space-y-3 rounded-xl border p-4 ${dark ? "border-admin-border-dark" : "border-admin-border"}`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Section {sectionIndex + 1}</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={disabled || sectionIndex === 0}
                onClick={() => moveSection(sectionIndex, -1)}
                className="rounded p-1 hover:bg-black/5 disabled:opacity-40"
                aria-label="Move section up"
              >
                <ChevronUp size={16} />
              </button>
              <button
                type="button"
                disabled={disabled || sectionIndex === sections.length - 1}
                onClick={() => moveSection(sectionIndex, 1)}
                className="rounded p-1 hover:bg-black/5 disabled:opacity-40"
                aria-label="Move section down"
              >
                <ChevronDown size={16} />
              </button>
              <button
                type="button"
                disabled={disabled || sections.length <= 1}
                onClick={() => removeSection(sectionIndex)}
                className="rounded p-1 text-admin-danger hover:bg-black/5 disabled:opacity-40"
                aria-label="Remove section"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <AdminInput
            label="Eyebrow"
            value={section.eyebrow ?? ""}
            disabled={disabled}
            onChange={(e) => updateSection(sectionIndex, { eyebrow: e.target.value })}
          />
          <AdminInput
            label="Heading"
            value={section.heading}
            disabled={disabled}
            onChange={(e) => updateSection(sectionIndex, { heading: e.target.value })}
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Paragraphs</p>
              <AdminButton
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() =>
                  updateSection(sectionIndex, { paragraphs: [...section.paragraphs, ""] })
                }
              >
                Add Paragraph
              </AdminButton>
            </div>
            {section.paragraphs.map((paragraph, paragraphIndex) => (
              <div key={paragraphIndex} className="flex gap-2">
                <AdminTextarea
                  label={`Paragraph ${paragraphIndex + 1}`}
                  value={paragraph}
                  disabled={disabled}
                  onChange={(e) => updateParagraph(sectionIndex, paragraphIndex, e.target.value)}
                />
                <button
                  type="button"
                  className="mt-6 text-admin-danger"
                  disabled={disabled || section.paragraphs.length <= 1}
                  onClick={() =>
                    updateSection(sectionIndex, {
                      paragraphs: section.paragraphs.filter((_, i) => i !== paragraphIndex),
                    })
                  }
                  aria-label="Remove paragraph"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Bullet List</p>
              <AdminButton
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={() =>
                  updateSection(sectionIndex, { list: [...(section.list ?? []), ""] })
                }
              >
                Add Bullet
              </AdminButton>
            </div>
            {(section.list ?? []).map((item, listIndex) => (
              <div key={listIndex} className="flex gap-2">
                <AdminInput
                  label={`Bullet ${listIndex + 1}`}
                  value={item}
                  disabled={disabled}
                  onChange={(e) => updateListItem(sectionIndex, listIndex, e.target.value)}
                />
                <button
                  type="button"
                  className="mt-6 text-admin-danger"
                  disabled={disabled}
                  onClick={() =>
                    updateSection(sectionIndex, {
                      list: (section.list ?? []).filter((_, i) => i !== listIndex),
                    })
                  }
                  aria-label="Remove bullet"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
