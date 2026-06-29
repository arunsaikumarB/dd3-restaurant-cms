import { useState } from "react";
import { CalendarDays } from "lucide-react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import DataTable from "../components/shared/DataTable";
import StatusChip from "../components/shared/StatusChip";
import ActionMenu from "../components/shared/ActionMenu";
import { MOCK_RESERVATIONS } from "../data/mock";
import type { Reservation } from "../types";

export default function ReservationsPage() {
  const [reservations] = useState(MOCK_RESERVATIONS);

  const columns = [
    { key: "name", label: "Guest", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "time", label: "Time", sortable: true },
    { key: "guests", label: "Guests", sortable: true },
    { key: "phone", label: "Phone" },
    {
      key: "notes",
      label: "Notes",
      render: (row: Reservation) => (
        <span className="max-w-[160px] truncate block">{row.notes || "—"}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row: Reservation) => <StatusChip status={row.status} />,
    },
    {
      key: "actions",
      label: "",
      render: () => <ActionMenu onEdit={() => {}} onDelete={() => {}} />,
    },
  ];

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Reservations" }]} />
      <PageHeader
        title="Reservations"
        description="View and manage table bookings."
      />

      <DataTable
        data={reservations as unknown as Record<string, unknown>[]}
        columns={columns as never}
        searchKeys={["name", "phone"]}
        filterOptions={{
          key: "status",
          label: "Status",
          options: [
            { value: "confirmed", label: "Confirmed" },
            { value: "pending", label: "Pending" },
            { value: "cancelled", label: "Cancelled" },
            { value: "completed", label: "Completed" },
          ],
        }}
        pageSize={5}
        emptyIcon={CalendarDays}
        emptyTitle="No reservations"
        emptyDescription="Reservations will appear here when guests book online."
      />
    </div>
  );
}
