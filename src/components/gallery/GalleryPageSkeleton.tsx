export function GalleryPageSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, index) => (
        <div
          key={index}
          className="aspect-[4/3] rounded-[24px] bg-cocoa/8"
        />
      ))}
    </div>
  );
}
