import { useCallback, useEffect, useMemo, useState } from "react";
import { Star, Search } from "lucide-react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import DataTable from "../components/shared/DataTable";
import StatusChip from "../components/shared/StatusChip";
import ActionMenu from "../components/shared/ActionMenu";
import AdminButton from "../components/ui/Button";
import AdminSelect from "../components/ui/Select";
import AdminModal, { ModalFooter } from "../components/ui/Modal";
import AdminInput from "../components/ui/Input";
import AdminTextarea from "../components/ui/Textarea";
import AdminToggle from "../components/ui/Toggle";
import AdminToast from "../components/ui/Toast";
import ReviewsPageSkeleton from "../components/settings/ReviewsPageSkeleton";
import { useAdminTheme } from "../context/AdminThemeContext";
import {
  createReview,
  deleteReview,
  EMPTY_REVIEW_FORM,
  fetchReviews,
  RATING_FILTER_OPTIONS,
  rowToForm,
  updateReview,
  updateReviewApproved,
  updateReviewFeatured,
  type ReviewForm,
  type ReviewTableRow,
} from "../../services/reviews";
import {
  hasValidationErrors,
  validateReviewForm,
  type ReviewErrors,
} from "../../utils/validation/reviews";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < rating ? "fill-admin-gold text-admin-gold" : "text-gray-300"}
        />
      ))}
    </div>
  );
}

type ApprovalFilter = "all" | "approved" | "pending" | "featured";
type RatingFilter = "all" | "1" | "2" | "3" | "4" | "5";
type SortOption = "newest" | "oldest" | "rating_high" | "rating_low" | "alphabetical";

const APPROVAL_FILTER_OPTIONS = [
  { value: "all", label: "All Reviews" },
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "featured", label: "Featured" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "rating_high", label: "Highest Rating" },
  { value: "rating_low", label: "Lowest Rating" },
  { value: "alphabetical", label: "Alphabetical" },
] as const;

const RATING_OPTIONS = [
  { value: "5", label: "5 Stars" },
  { value: "4", label: "4 Stars" },
  { value: "3", label: "3 Stars" },
  { value: "2", label: "2 Stars" },
  { value: "1", label: "1 Star" },
];

export default function ReviewsPage() {
  const { dark } = useAdminTheme();
  const [reviews, setReviews] = useState<ReviewTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>("all");
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingReview, setDeletingReview] = useState<ReviewTableRow | null>(null);
  const [form, setForm] = useState<ReviewForm>(EMPTY_REVIEW_FORM);
  const [fieldErrors, setFieldErrors] = useState<ReviewErrors>({});
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

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchReviews();
      setReviews(rows);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const filteredReviews = useMemo(() => {
    let result = [...reviews];
    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (row) =>
          row.customer_name.toLowerCase().includes(query) ||
          row.review.toLowerCase().includes(query),
      );
    }

    if (approvalFilter === "approved") {
      result = result.filter((row) => row.approved);
    } else if (approvalFilter === "pending") {
      result = result.filter((row) => !row.approved);
    } else if (approvalFilter === "featured") {
      result = result.filter((row) => row.featured);
    }

    if (ratingFilter !== "all") {
      const rating = Number(ratingFilter);
      result = result.filter((row) => row.rating === rating);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return a.created_at.localeCompare(b.created_at);
        case "rating_high":
          return b.rating - a.rating || b.created_at.localeCompare(a.created_at);
        case "rating_low":
          return a.rating - b.rating || b.created_at.localeCompare(a.created_at);
        case "alphabetical":
          return a.customer_name.localeCompare(b.customer_name);
        case "newest":
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });

    return result;
  }, [reviews, search, approvalFilter, ratingFilter, sortBy]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ ...EMPTY_REVIEW_FORM });
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEditModal = (row: ReviewTableRow) => {
    setEditingId(row.id);
    setForm(rowToForm(row));
    setFieldErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalOpen(false);
    setEditingId(null);
    setFieldErrors({});
  };

  const handleSave = async () => {
    if (submitting) return;

    const errors = validateReviewForm(form);
    setFieldErrors(errors);
    if (hasValidationErrors(errors)) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateReview(editingId, form);
        showToast("Review updated successfully.");
      } else {
        await createReview(form);
        showToast("Review created successfully.");
      }
      setModalOpen(false);
      setEditingId(null);
      setFieldErrors({});
      await loadReviews();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save review.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (row: ReviewTableRow) => {
    setDeletingReview(row);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingReview || deleting) return;

    setDeleting(true);
    try {
      await deleteReview(deletingReview.id);
      showToast("Review deleted successfully.");
      setDeleteOpen(false);
      setDeletingReview(null);
      await loadReviews();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete review.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleApprove = async (row: ReviewTableRow) => {
    if (togglingId) return;

    setTogglingId(row.id);
    try {
      const updated = await updateReviewApproved(row.id, true);
      setReviews((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
      showToast("Review approved.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to approve review.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleUnapprove = async (row: ReviewTableRow) => {
    if (togglingId) return;

    setTogglingId(row.id);
    try {
      const updated = await updateReviewApproved(row.id, false);
      setReviews((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
      showToast("Review unapproved.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to unapprove review.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleApproved = async (row: ReviewTableRow) => {
    if (togglingId) return;

    const nextApproved = !row.approved;
    setTogglingId(row.id);
    try {
      const updated = await updateReviewApproved(row.id, nextApproved);
      setReviews((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
      showToast(nextApproved ? "Review approved." : "Review unapproved.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update approval status.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleFeatured = async (row: ReviewTableRow) => {
    if (togglingId) return;

    const nextFeatured = !row.featured;
    setTogglingId(row.id);
    try {
      const updated = await updateReviewFeatured(row.id, nextFeatured);
      setReviews((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
      showToast(nextFeatured ? "Review marked as featured." : "Review removed from featured.");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update featured status.", "error");
    } finally {
      setTogglingId(null);
    }
  };

  const columns = [
    {
      key: "rating",
      label: "Rating",
      render: (row: ReviewTableRow) => <StarRating rating={row.rating} />,
    },
    { key: "customer", label: "Customer", sortable: true },
    {
      key: "review",
      label: "Review",
      render: (row: ReviewTableRow) => (
        <span className="max-w-xs truncate block">{row.review}</span>
      ),
    },
    { key: "date", label: "Date", sortable: true },
    {
      key: "status",
      label: "Status",
      render: (row: ReviewTableRow) => <StatusChip status={row.status} />,
    },
    {
      key: "approved",
      label: "Approved",
      render: (row: ReviewTableRow) => (
        <AdminToggle
          checked={row.approved}
          onChange={() => void handleToggleApproved(row)}
          label={row.approved ? "Yes" : "No"}
        />
      ),
    },
    {
      key: "featured",
      label: "Featured",
      render: (row: ReviewTableRow) => (
        <AdminToggle
          checked={row.featured}
          onChange={() => void handleToggleFeatured(row)}
          label={row.featured ? "Yes" : "No"}
        />
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: ReviewTableRow) =>
        row.status === "pending" ? (
          <div className="flex items-center gap-2">
            <AdminButton
              size="sm"
              variant="outline"
              disabled={togglingId === row.id}
              onClick={() => void handleApprove(row)}
            >
              Approve
            </AdminButton>
            <ActionMenu
              onEdit={() => openEditModal(row)}
              onDelete={() => openDeleteModal(row)}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <AdminButton
              size="sm"
              variant="outline"
              disabled={togglingId === row.id}
              onClick={() => void handleUnapprove(row)}
            >
              Unapprove
            </AdminButton>
            <ActionMenu
              onEdit={() => openEditModal(row)}
              onDelete={() => openDeleteModal(row)}
            />
          </div>
        ),
    },
  ];

  if (loading) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Reviews" }]} />
        <PageHeader
          title="Reviews"
          description="Moderate customer feedback and testimonials."
          actionLabel="Add Review"
          onAction={openCreateModal}
        />
        <ReviewsPageSkeleton />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Reviews" }]} />
        <PageHeader
          title="Reviews"
          description="Moderate customer feedback and testimonials."
          actionLabel="Add Review"
          onAction={openCreateModal}
        />
        <div className="rounded-2xl border p-6">
          <p className="text-sm text-admin-danger">{loadError}</p>
          <div className="mt-4">
            <AdminButton type="button" onClick={() => void loadReviews()}>
              Retry
            </AdminButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Reviews" }]} />
      <PageHeader
        title="Reviews"
        description="Moderate customer feedback and testimonials."
        actionLabel="Add Review"
        onAction={openCreateModal}
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="relative max-w-sm flex-1">
          <Search
            size={16}
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? "text-white/40" : "text-admin-muted"}`}
          />
          <input
            type="search"
            placeholder="Search reviews..."
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
            label="Filter"
            value={approvalFilter}
            onChange={(v) => setApprovalFilter(v as ApprovalFilter)}
            options={APPROVAL_FILTER_OPTIONS}
          />
        </div>
        <div className="w-44">
          <AdminSelect
            label="Rating"
            value={ratingFilter}
            onChange={(v) => setRatingFilter(v as RatingFilter)}
            options={RATING_FILTER_OPTIONS}
          />
        </div>
        <div className="w-44">
          <AdminSelect
            label="Sort by"
            value={sortBy}
            onChange={(v) => setSortBy(v as SortOption)}
            options={[...SORT_OPTIONS]}
          />
        </div>
      </div>

      <DataTable
        data={filteredReviews as unknown as Record<string, unknown>[]}
        columns={columns as never}
        hideToolbar
        pageSize={5}
        emptyIcon={Star}
        emptyTitle="No reviews yet"
        emptyDescription="Customer reviews will appear here for moderation."
        onCreateClick={openCreateModal}
        createLabel="Add Review"
      />

      <AdminModal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Review" : "Add Review"}
        size="lg"
        footer={
          <ModalFooter
            onCancel={closeModal}
            onConfirm={() => void handleSave()}
            confirmLabel={editingId ? "Save Changes" : "Add Review"}
            loading={submitting}
          />
        }
      >
        <ReviewFormFields
          form={form}
          fieldErrors={fieldErrors}
          disabled={submitting}
          onPatch={setForm}
        />
      </AdminModal>

      <AdminModal
        open={deleteOpen}
        onClose={() => {
          if (deleting) return;
          setDeleteOpen(false);
          setDeletingReview(null);
        }}
        title="Delete Review"
        footer={
          <ModalFooter
            onCancel={() => {
              if (deleting) return;
              setDeleteOpen(false);
              setDeletingReview(null);
            }}
            onConfirm={() => void handleDelete()}
            confirmLabel="Delete"
            loading={deleting}
          />
        }
      >
        <p className={`text-sm ${dark ? "text-white/70" : "text-admin-text/80"}`}>
          Are you sure you want to delete the review from{" "}
          <span className="font-medium">{deletingReview?.customer_name}</span>? This action cannot be undone.
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

interface ReviewFormFieldsProps {
  form: ReviewForm;
  fieldErrors: ReviewErrors;
  disabled?: boolean;
  onPatch: (updater: ReviewForm | ((prev: ReviewForm) => ReviewForm)) => void;
}

function ReviewFormFields({ form, fieldErrors, disabled, onPatch }: ReviewFormFieldsProps) {
  const patch = (partial: Partial<ReviewForm>) => {
    onPatch((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="space-y-4">
      <AdminInput
        label="Customer Name"
        placeholder="Michael R."
        value={form.customer_name}
        error={fieldErrors.customer_name}
        disabled={disabled}
        onChange={(e) => patch({ customer_name: e.target.value })}
      />
      <AdminSelect
        label="Rating"
        value={String(form.rating)}
        onChange={(value) => patch({ rating: Number(value) })}
        options={RATING_OPTIONS}
      />
      {fieldErrors.rating && <p className="text-xs text-admin-danger">{fieldErrors.rating}</p>}
      <AdminTextarea
        label="Review"
        placeholder="Share the customer's feedback..."
        value={form.review}
        disabled={disabled}
        onChange={(e) => patch({ review: e.target.value })}
      />
      {fieldErrors.review && <p className="text-xs text-admin-danger">{fieldErrors.review}</p>}
      <AdminToggle
        checked={form.approved}
        onChange={(checked) => patch({ approved: checked })}
        label={form.approved ? "Approved" : "Pending"}
      />
      <AdminToggle
        checked={form.featured}
        onChange={(checked) => patch({ featured: checked })}
        label={form.featured ? "Featured" : "Not featured"}
      />
    </div>
  );
}
