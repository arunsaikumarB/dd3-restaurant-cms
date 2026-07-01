import { usePageContent } from "../../context/PageContentContext";

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount?: number;
}

export default function SearchBar({
  value,
  onChange,
  resultCount,
}: SearchBarProps) {
  const { fetchSection } = usePageContent();
  const toolbar = fetchSection("menu", "toolbar", {
    searchPlaceholder: "Search by food name…",
    allCategoriesLabel: "All Categories",
  });

  return (
    <div className="relative w-full max-w-xl">
      <label htmlFor="menu-search" className="sr-only">
        Search menu by food name
      </label>
      <svg
        aria-hidden
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-cocoa/40"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
        />
      </svg>
      <input
        id="menu-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={toolbar.searchPlaceholder}
        autoComplete="off"
        className="w-full rounded-full border border-cocoa/10 bg-white/80 py-3.5 pl-12 pr-5 text-[15px] text-cocoa shadow-sm outline-none transition-all duration-300 placeholder:text-cocoa/40 focus:border-saffron focus:ring-2 focus:ring-saffron/20"
        aria-describedby={resultCount != null ? "search-results-count" : undefined}
      />
      {resultCount != null && (
        <p id="search-results-count" className="sr-only">
          {resultCount} items found
        </p>
      )}
    </div>
  );
}
