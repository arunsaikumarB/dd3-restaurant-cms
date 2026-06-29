export default function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-ivory">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cocoa/10 border-t-saffron" />
        <p className="text-[12px] uppercase tracking-label text-cocoa/50">
          Loading
        </p>
      </div>
    </div>
  );
}
