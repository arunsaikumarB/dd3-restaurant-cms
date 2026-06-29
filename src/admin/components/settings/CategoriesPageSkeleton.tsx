import AdminCard from "../ui/Card";
import { AdminSkeleton } from "../ui/Skeleton";

export default function CategoriesPageSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <AdminCard key={i} className="overflow-hidden p-0">
          <AdminSkeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="flex items-center justify-between p-4">
            <AdminSkeleton className="h-4 w-16" />
            <AdminSkeleton className="h-8 w-16" />
          </div>
        </AdminCard>
      ))}
    </div>
  );
}
