import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import DataTable from "../components/shared/DataTable";
import ActionMenu from "../components/shared/ActionMenu";
import AdminButton from "../components/ui/Button";
import AdminSelect from "../components/ui/Select";
import AdminModal, { ModalFooter } from "../components/ui/Modal";
import AdminInput from "../components/ui/Input";
import AdminTextarea from "../components/ui/Textarea";
import AdminToast from "../components/ui/Toast";
import ReservationsPageSkeleton from "../components/settings/ReservationsPageSkeleton";
import { useAdminTheme } from "../context/AdminThemeContext";
import {
  createReservation,
  deleteReservation,
  EMPTY_RESERVATION_FORM,
  fetchReservations,
  GUESTS_FILTER_OPTIONS,
  rowToForm,
  STATUS_FILTER_OPTIONS,
  STATUS_OPTIONS,
  updateReservation,
  updateReservationStatus,
  type ReservationForm,
  type ReservationTableRow,
} from "../../services/reservations";
import type { ReservationStatus } from "../../types/database";
import {
  hasValidationErrors,
  validateReservationForm,
  type ReservationErrors,
} from "../../utils/validation/reservations";

type StatusFilter = ReservationStatus | "all";
type GuestsFilter = "all" | "1" | "2" | "3" | "4" | "5" | "6+";
type SortOption = "newest" | "oldest" | "reservation_date" | "customer_name" | "guests";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "reservation_date", label: "Reservation Date" },
  { value: "customer_name", label: "Customer Name" },
  { value: "guests", label: "Guests" },
] as const;

export default function ReservationsPage() {
  const { dark } = useAdminTheme();
  const [reservations, setReservations] = useState<ReservationTableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState("");
  const [guestsFilter, setGuestsFilter] = useState<GuestsFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingReservation, setDeletingReservation] = useState<ReservationTableRow | null>(null);
  const [form, setForm] = useState<ReservationForm>(EMPTY_RESERVATION_FORM);
  const [fieldErrors, setFieldErrors] = useState<ReservationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: "success" | "error" }>({
    open: false,
    message: "",
    variant: "success",
  });

  const showToast = useCallback((message: string, variant: "success" | "error" = "success") => {
    setToast({ open: true, message, variant });
  }, []);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await fetchReservations();
      setReservations(rows);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load reservations.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReservations();
  }, [loadReservations]);

  const filteredReservations = useMemo(() => {
    let result = [...reservations];
    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (row) =>
          row.customer_name.toLowerCase().includes(query) ||
          row.phone.toLowerCase().includes(query) ||
          row.email.toLowerCase().includes(query),
      );
    }

    if (statusFilter !== "all") {
      result = result.filter((row) => row.status === statusFilter);
    }

    if (dateFilter) {
      result = result.filter((row) => row.date === dateFilter);
    }

    if (guestsFilter !== "all") {
      if (guestsFilter === "6+") {
        result = result.filter((row) => row.guests >= 6);
      } else {
        const guests = Number(guestsFilter);
        result = result.filter((row) => row.guests === guests);
      }
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return a.created_at.localeCompare(b.created_at);
        case "reservation_date":
          return b.date.localeCompare(a.date) || b.time_value.localeCompare(a.time_value);
        case "customer_name":
          return a.customer_name.localeCompare(b.customer_name);
        case "guests":
          return b.guests - a.guests || b.created_at.localeCompare(a.created_at);
        case "newest":
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });

    return result;
  }, [reservations, search, statusFilter, dateFilter, guestsFilter, sortBy]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm({ ...EMPTY_RESERVATION_FORM });
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEditModal = (row: ReservationTableRow) => {
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

    const errors = validateReservationForm(form);
    setFieldErrors(errors);
    if (hasValidationErrors(errors)) {
      showToast("Please fix the highlighted fields.", "error");
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await updateReservation(editingId, form);
        showToast("Reservation updated successfully.");
      } else {
        await createReservation(form);
        showToast("Reservation created successfully.");
      }
      setModalOpen(false);
      setEditingId(null);
      setFieldErrors({});
      await loadReservations();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save reservation.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (row: ReservationTableRow) => {
    setDeletingReservation(row);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingReservation || deleting) return;

    setDeleting(true);
    try {
      await deleteReservation(deletingReservation.id);
      showToast("Reservation deleted successfully.");
      setDeleteOpen(false);
      setDeletingReservation(null);
      await loadReservations();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to delete reservation.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (row: ReservationTableRow, status: ReservationStatus) => {
    if (updatingStatusId || row.status === status) return;

    setUpdatingStatusId(row.id);
    try {
      const updated = await updateReservationStatus(row.id, status);
      setReservations((prev) => prev.map((item) => (item.id === row.id ? updated : item)));
      showToast(`Reservation marked as ${status}.`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update status.", "error");
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const columns = [
    { key: "name", label: "Guest", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "time", label: "Time", sortable: true },
    { key: "guests", label: "Guests", sortable: true },
    { key: "phone", label: "Phone" },
    {
      key: "notes",
      label: "Notes",
      render: (row: ReservationTableRow) => (
        <span className="max-w-[160px] truncate block">{row.notes || "—"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: ReservationTableRow) => (
        <div className="min-w-[132px]">
          <AdminSelect
            value={row.status}
            onChange={(value) => void handleStatusChange(row, value as ReservationStatus)}
            options={[...STATUS_OPTIONS]}
          />
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row: ReservationTableRow) => (
        <ActionMenu
          onEdit={() => openEditModal(row)}
          onDelete={() => openDeleteModal(row)}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Reservations" }]} />
        <PageHeader
          title="Reservations"
          description="View and manage table bookings."
          actionLabel="Add Reservation"
          onAction={openCreateModal}
        />
        <ReservationsPageSkeleton />
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Reservations" }]} />
        <PageHeader
          title="Reservations"
          description="View and manage table bookings."
          actionLabel="Add Reservation"
          onAction={openCreateModal}
        />
        <div className="rounded-2xl border p-6">
          <p className="text-sm text-admin-danger">{loadError}</p>
          <div className="mt-4">
            <AdminButton type="button" onClick={() => void loadReservations()}>
              Retry
            </AdminButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Reservations" }]} />
      <PageHeader
        title="Reservations"
        description="View and manage table bookings."
        actionLabel="Add Reservation"
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
            placeholder="Search reservations..."
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
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
        <div className="w-44">
          <AdminInput
            label="Reservation Date"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        <div className="w-44">
          <AdminSelect
            label="Guests"
            value={guestsFilter}
            onChange={(v) => setGuestsFilter(v as GuestsFilter)}
            options={GUESTS_FILTER_OPTIONS}
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
        data={filteredReservations as unknown as Record<string, unknown>[]}
        columns={columns as never}
        hideToolbar
        pageSize={5}
        emptyIcon={CalendarDays}
        emptyTitle="No reservations"
        emptyDescription="Reservations will appear here when guests book online."
        onCreateClick={openCreateModal}
        createLabel="Add Reservation"
      />

      <AdminModal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Reservation" : "Add Reservation"}
        size="lg"
        footer={
          <ModalFooter
            onCancel={closeModal}
            onConfirm={() => void handleSave()}
            confirmLabel={editingId ? "Save Changes" : "Add Reservation"}
            loading={submitting}
          />
        }
      >
        <ReservationFormFields
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
          setDeletingReservation(null);
        }}
        title="Delete Reservation"
        footer={
          <ModalFooter
            onCancel={() => {
              if (deleting) return;
              setDeleteOpen(false);
              setDeletingReservation(null);
            }}
            onConfirm={() => void handleDelete()}
            confirmLabel="Delete"
            loading={deleting}
          />
        }
      >
        <p className={`text-sm ${dark ? "text-white/70" : "text-admin-text/80"}`}>
          Are you sure you want to delete the reservation for{" "}
          <span className="font-medium">{deletingReservation?.customer_name}</span> on{" "}
          <span className="font-medium">{deletingReservation?.date}</span>? This action cannot be undone.
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

interface ReservationFormFieldsProps {
  form: ReservationForm;
  fieldErrors: ReservationErrors;
  disabled?: boolean;
  onPatch: (updater: ReservationForm | ((prev: ReservationForm) => ReservationForm)) => void;
}

function ReservationFormFields({ form, fieldErrors, disabled, onPatch }: ReservationFormFieldsProps) {
  const patch = (partial: Partial<ReservationForm>) => {
    onPatch((prev) => ({ ...prev, ...partial }));
  };

  return (
    <div className="space-y-4">
      <AdminInput
        label="Customer Name"
        placeholder="Priya Sharma"
        value={form.customer_name}
        error={fieldErrors.customer_name}
        disabled={disabled}
        onChange={(e) => patch({ customer_name: e.target.value })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminInput
          label="Phone"
          placeholder="(609) 555-0142"
          value={form.phone}
          error={fieldErrors.phone}
          disabled={disabled}
          onChange={(e) => patch({ phone: e.target.value })}
        />
        <AdminInput
          label="Email"
          type="email"
          placeholder="guest@example.com"
          value={form.email}
          error={fieldErrors.email}
          disabled={disabled}
          onChange={(e) => patch({ email: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <AdminInput
          label="Reservation Date"
          type="date"
          value={form.date}
          error={fieldErrors.date}
          disabled={disabled}
          onChange={(e) => patch({ date: e.target.value })}
        />
        <AdminInput
          label="Reservation Time"
          type="time"
          value={form.time}
          error={fieldErrors.time}
          disabled={disabled}
          onChange={(e) => patch({ time: e.target.value })}
        />
      </div>
      <AdminInput
        label="Guests"
        type="number"
        min={1}
        value={String(form.guests)}
        error={fieldErrors.guests}
        disabled={disabled}
        onChange={(e) => patch({ guests: Number(e.target.value) })}
      />
      <AdminTextarea
        label="Special Request"
        placeholder="Window seat, dietary notes, celebration details..."
        value={form.special_request}
        disabled={disabled}
        onChange={(e) => patch({ special_request: e.target.value })}
      />
      <AdminSelect
        label="Status"
        value={form.status}
        onChange={(value) => patch({ status: value as ReservationStatus })}
        options={[...STATUS_OPTIONS]}
      />
    </div>
  );
}
