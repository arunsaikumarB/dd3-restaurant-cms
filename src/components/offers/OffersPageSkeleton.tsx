export function OffersPageSkeleton() {
  return (
    <div className="grid animate-pulse gap-6 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-[24px] bg-cocoa/6">
          <div className="aspect-[16/9] bg-cocoa/8" />
          <div className="space-y-3 p-6">
            <div className="h-4 w-24 rounded-full bg-cocoa/8" />
            <div className="h-8 w-3/4 rounded-lg bg-cocoa/8" />
            <div className="h-4 w-full rounded bg-cocoa/8" />
            <div className="h-4 w-5/6 rounded bg-cocoa/8" />
          </div>
        </div>
      ))}
    </div>
  );
}
