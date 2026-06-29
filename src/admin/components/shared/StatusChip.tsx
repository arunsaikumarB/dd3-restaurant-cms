import AdminBadge from "../ui/Badge";

const statusVariant: Record<string, "success" | "warning" | "danger" | "info" | "default" | "outline"> = {
  active: "success",
  approved: "success",
  confirmed: "success",
  completed: "success",
  inactive: "outline",
  pending: "warning",
  draft: "default",
  rejected: "danger",
  cancelled: "danger",
};

export default function StatusChip({ status }: { status: string }) {
  const variant = statusVariant[status] ?? "default";
  return (
    <AdminBadge variant={variant}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </AdminBadge>
  );
}
