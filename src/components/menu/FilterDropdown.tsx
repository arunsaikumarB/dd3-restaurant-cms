import type { MenuCategory } from "../../types/menu";

export interface FilterDropdownProps {
  categories: MenuCategory[];
  value: string | null;
  onChange: (categoryId: string | null) => void;
}

export default function FilterDropdown({
  categories,
  value,
  onChange,
}: FilterDropdownProps) {
  return (
    <div className="relative w-full sm:w-auto">
      <label htmlFor="menu-filter" className="sr-only">
        Filter by category
      </label>
      <select
        id="menu-filter"
        value={value ?? "all"}
        onChange={(e) =>
          onChange(e.target.value === "all" ? null : e.target.value)
        }
        className="w-full cursor-pointer appearance-none rounded-full border border-cocoa/10 bg-white/80 py-3.5 pl-5 pr-12 text-[14px] font-medium text-cocoa shadow-sm outline-none transition-all duration-300 focus:border-saffron focus:ring-2 focus:ring-saffron/20 sm:min-w-[220px]"
      >
        <option value="all">All Categories</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
      <svg
        aria-hidden
        className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa/50"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
      </svg>
    </div>
  );
}
