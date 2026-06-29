export function MenuToolbarSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="h-12 w-full max-w-xl rounded-full bg-cocoa/8" />
      <div className="h-12 w-full rounded-full bg-cocoa/8 sm:w-56" />
    </div>
  );
}

export function CategoryTabsSkeleton() {
  return (
    <div className="flex animate-pulse gap-2 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-10 w-28 shrink-0 rounded-full bg-cocoa/8" />
      ))}
    </div>
  );
}

export function MenuGridSkeleton() {
  return (
    <div className="space-y-16">
      {Array.from({ length: 3 }).map((_, section) => (
        <div key={section} className="animate-pulse">
          <div className="mb-8 h-10 w-48 rounded-lg bg-cocoa/8" />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            {Array.from({ length: 4 }).map((__, card) => (
              <div
                key={card}
                className="h-36 rounded-[24px] bg-cocoa/6"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
