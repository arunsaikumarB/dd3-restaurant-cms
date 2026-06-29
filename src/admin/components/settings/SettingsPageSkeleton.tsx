import AdminCard from "../ui/Card";
import { AdminSkeleton } from "../ui/Skeleton";

export default function SettingsPageSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <AdminCard key={i}>
          <AdminSkeleton className="mb-4 h-5 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminSkeleton className="h-10 w-full" />
            <AdminSkeleton className="h-10 w-full" />
            <AdminSkeleton className="h-10 w-full sm:col-span-2" />
          </div>
        </AdminCard>
      ))}
      <div className="flex justify-end gap-2">
        <AdminSkeleton className="h-10 w-24" />
        <AdminSkeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
