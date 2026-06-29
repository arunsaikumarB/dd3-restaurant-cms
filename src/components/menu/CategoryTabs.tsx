import { useEffect, useRef } from "react";
import type { MenuCategory } from "../../types/menu";

export interface CategoryTabsProps {
  categories: MenuCategory[];
  activeId: string | null;
  onSelect: (categoryId: string | null) => void;
}

export default function CategoryTabs({
  categories,
  activeId,
  onSelect,
}: CategoryTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeId]);

  const scrollToCategory = (id: string | null) => {
    onSelect(id);
    if (!id) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(`category-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const tabs = [{ id: null as string | null, name: "All" }, ...categories.map((c) => ({ id: c.id, name: c.name }))];

  return (
    <div
      ref={listRef}
      className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Menu categories"
    >
      {tabs.map((tab) => {
        const isActive = activeId === tab.id;
        return (
          <button
            key={tab.id ?? "all"}
            ref={isActive ? activeRef : undefined}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={tab.id ? `category-${tab.id}` : undefined}
            id={tab.id ? `tab-${tab.id}` : "tab-all"}
            onClick={() => scrollToCategory(tab.id)}
            className={
              "shrink-0 rounded-full px-5 py-2.5 text-[12px] font-semibold uppercase tracking-label transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-saffron focus-visible:ring-offset-2 " +
              (isActive
                ? "bg-cocoa text-ivory shadow-md"
                : "border border-cocoa/10 bg-white/70 text-cocoa/70 hover:border-saffron/40 hover:text-cocoa")
            }
          >
            {tab.name}
          </button>
        );
      })}
    </div>
  );
}
