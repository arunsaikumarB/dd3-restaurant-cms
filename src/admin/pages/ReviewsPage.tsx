import { useState } from "react";
import { Star } from "lucide-react";
import AdminBreadcrumbs from "../components/shared/Breadcrumbs";
import PageHeader from "../components/shared/PageHeader";
import DataTable from "../components/shared/DataTable";
import StatusChip from "../components/shared/StatusChip";
import AdminButton from "../components/ui/Button";
import { MOCK_REVIEWS } from "../data/mock";
import type { Review } from "../types";

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

export default function ReviewsPage() {
  const [reviews, setReviews] = useState(MOCK_REVIEWS);

  const updateStatus = (id: string, status: Review["status"]) => {
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const columns = [
    {
      key: "rating",
      label: "Rating",
      render: (row: Review) => <StarRating rating={row.rating} />,
    },
    { key: "customer", label: "Customer", sortable: true },
    {
      key: "review",
      label: "Review",
      render: (row: Review) => (
        <span className="max-w-xs truncate block">{row.review}</span>
      ),
    },
    { key: "date", label: "Date", sortable: true },
    {
      key: "status",
      label: "Status",
      render: (row: Review) => <StatusChip status={row.status} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row: Review) =>
        row.status === "pending" ? (
          <div className="flex gap-2">
            <AdminButton size="sm" variant="outline" onClick={() => updateStatus(row.id, "approved")}>
              Approve
            </AdminButton>
            <AdminButton size="sm" variant="danger" onClick={() => updateStatus(row.id, "rejected")}>
              Reject
            </AdminButton>
          </div>
        ) : (
          <span className="text-xs text-admin-muted">—</span>
        ),
    },
  ];

  return (
    <div>
      <AdminBreadcrumbs items={[{ label: "Admin", path: "/admin/dashboard" }, { label: "Reviews" }]} />
      <PageHeader
        title="Reviews"
        description="Moderate customer feedback and testimonials."
      />

      <DataTable
        data={reviews as unknown as Record<string, unknown>[]}
        columns={columns as never}
        searchKeys={["customer", "review"]}
        filterOptions={{
          key: "status",
          label: "Status",
          options: [
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ],
        }}
        pageSize={5}
        emptyIcon={Star}
        emptyTitle="No reviews yet"
        emptyDescription="Customer reviews will appear here for moderation."
      />
    </div>
  );
}
