import AdminCard from "../ui/Card";
import { AdminSkeleton } from "../ui/Skeleton";

export default function HomepagePageSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <AdminCard padding="sm">
        <div className="space-y-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <AdminSkeleton key={i} className="h-11 w-full rounded-xl" />
          ))}
        </div>
      </AdminCard>
      <AdminCard>
        <AdminSkeleton className="h-6 w-48" />
        <AdminSkeleton className="mt-2 h-4 w-72" />
        <div className="mt-6 space-y-4">
          <AdminSkeleton className="h-10 w-full" />
          <AdminSkeleton className="h-24 w-full" />
          <AdminSkeleton className="h-10 w-full" />
          <AdminSkeleton className="h-10 w-full" />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <AdminSkeleton className="h-10 w-24" />
          <AdminSkeleton className="h-10 w-32" />
        </div>
      </AdminCard>
    </div>
  );
}
