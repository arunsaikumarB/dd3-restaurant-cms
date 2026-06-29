import AdminCard from "../ui/Card";
import { AdminSkeleton } from "../ui/Skeleton";

export default function GalleryPageSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <AdminCard key={i} className="overflow-hidden p-0" padding="sm">
          <AdminSkeleton className="aspect-square w-full rounded-xl" />
          <AdminSkeleton className="mt-2 h-4 w-3/4" />
          <AdminSkeleton className="mt-2 h-8 w-full" />
        </AdminCard>
      ))}
    </div>
  );
}
