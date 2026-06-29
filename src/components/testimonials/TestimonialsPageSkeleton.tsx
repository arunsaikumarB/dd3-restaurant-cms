export function FeaturedReviewSkeleton() {
  return (
    <div className="animate-pulse rounded-[28px] bg-cocoa/6 p-8 md:p-12">
      <div className="space-y-4">
        <div className="h-6 w-full rounded bg-cocoa/8" />
        <div className="h-6 w-5/6 rounded bg-cocoa/8" />
        <div className="h-6 w-2/3 rounded bg-cocoa/8" />
      </div>
      <div className="mt-8 flex items-center gap-3 border-t border-cocoa/8 pt-6">
        <div className="h-11 w-11 rounded-full bg-cocoa/8" />
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-cocoa/8" />
          <div className="h-3 w-24 rounded bg-cocoa/8" />
        </div>
      </div>
    </div>
  );
}

export function ReviewsGridSkeleton() {
  return (
    <div className="mt-14 grid animate-pulse gap-5 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="rounded-[24px] bg-cocoa/6 p-7">
          <div className="mb-5 flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-cocoa/8" />
            <div className="space-y-2">
              <div className="h-4 w-28 rounded bg-cocoa/8" />
              <div className="h-3 w-20 rounded bg-cocoa/8" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full rounded bg-cocoa/8" />
            <div className="h-4 w-full rounded bg-cocoa/8" />
            <div className="h-4 w-4/5 rounded bg-cocoa/8" />
          </div>
        </div>
      ))}
    </div>
  );
}
