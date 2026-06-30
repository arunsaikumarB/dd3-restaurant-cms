export function OffersPageSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="mx-auto flex h-[420px] w-full max-w-[320px] flex-col overflow-hidden rounded-[24px] bg-cocoa/6 sm:max-w-none"
        >
          <div className="flex-1 bg-cocoa/8" />
          <div className="space-y-3 p-4">
            <div className="h-5 w-3/4 rounded-lg bg-cocoa/8" />
            <div className="h-3 w-full rounded bg-cocoa/8" />
            <div className="h-3 w-5/6 rounded bg-cocoa/8" />
          </div>
        </div>
      ))}
    </div>
  );
}
