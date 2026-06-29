import { useAdminTheme } from "../../context/AdminThemeContext";

interface SkeletonProps {
  className?: string;
}

export function AdminSkeleton({ className = "" }: SkeletonProps) {
  const { dark } = useAdminTheme();
  return (
    <div
      className={[
        "animate-pulse rounded-xl",
        dark ? "bg-white/10" : "bg-admin-border/60",
        className,
      ].join(" ")}
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <AdminSkeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <AdminSkeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-4 rounded-2xl border border-admin-border/60 p-6">
      <AdminSkeleton className="h-4 w-1/3" />
      <AdminSkeleton className="h-8 w-1/2" />
      <AdminSkeleton className="h-3 w-2/3" />
    </div>
  );
}
