import AdminCard from "../ui/Card";
import { AdminSkeleton } from "../ui/Skeleton";

export default function OffersPageSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <AdminCard key={i} className="overflow-hidden p-0">
          <AdminSkeleton className="h-40 w-full rounded-none" />
          <div className="flex items-center justify-between p-5">
            <div className="space-y-2">
              <AdminSkeleton className="h-3 w-40" />
              <AdminSkeleton className="h-5 w-20" />
            </div>
            <AdminSkeleton className="h-8 w-24" />
          </div>
        </AdminCard>
      ))}
    </div>
  );
}
