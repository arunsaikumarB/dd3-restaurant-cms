import { useCallback, useEffect, useMemo, useState } from "react";
import PageHero from "../components/ui/PageHero";
import CategorySection from "../components/menu/CategorySection";
import CategoryTabs from "../components/menu/CategoryTabs";
import FilterDropdown from "../components/menu/FilterDropdown";
import CTASection from "../components/ui/CTASection";
import {
  CategoryTabsSkeleton,
  MenuGridSkeleton,
  MenuToolbarSkeleton,
} from "../components/menu/MenuSkeleton";
import SearchBar from "../components/menu/SearchBar";
import { NAV_BAR_HEIGHT } from "../constants/navigation";
import { useMenuData } from "../hooks/useMenuData";
import { filterMenuData, flattenItems } from "../utils/menu";
import { useLocationSelection } from "../context/LocationContext";

export default function MenuPage() {
  const { selectedLocationId, selectedLocation } = useLocationSelection();
  const { data, loading, error } = useMenuData(selectedLocationId);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredCategories = useMemo(() => {
    if (!data) return [];
    return filterMenuData(data, search, filterCategory);
  }, [data, search, filterCategory]);

  const resultCount = useMemo(
    () => flattenItems(filteredCategories).length,
    [filteredCategories]
  );

  const handleTabSelect = useCallback((categoryId: string | null) => {
    setActiveCategory(categoryId);
    setFilterCategory(null);
  }, []);

  useEffect(() => {
    if (!data || filterCategory || search.trim()) return;

    const sections = data.categories
      .map((cat) => document.getElementById(`category-${cat.id}`))
      .filter(Boolean) as HTMLElement[];

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target.id) {
          const id = visible[0].target.id.replace("category-", "");
          setActiveCategory(id);
        }
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.15, 0.35, 0.55] }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [data, filterCategory, search]);

  useEffect(() => {
    if (filterCategory) setActiveCategory(filterCategory);
    if (search.trim()) setActiveCategory(null);
  }, [filterCategory, search]);

  return (
    <div className="min-h-screen bg-ivory">
      <PageHero
        label="The Menu"
        title="Menu"
        subtitle={`Discover authentic Indian flavours crafted with tradition, premium ingredients and unforgettable taste${selectedLocation ? ` at ${selectedLocation.shortName}` : ""}.`}
        backgroundImage="/showcase/biryani.jpg"
        breadcrumbItems={[
          { label: "Home", to: "/" },
          { label: "Menu" },
        ]}
      />

      <div
        className="sticky z-40 border-b border-cocoa/8 bg-ivory/96 shadow-[0_2px_16px_-4px_rgba(43,29,24,0.06)] backdrop-blur-xl"
        style={{ top: NAV_BAR_HEIGHT }}
      >
        <div className="mx-auto max-w-[1400px] space-y-4 px-6 py-4 md:px-10 lg:px-16">
          {loading ? (
            <>
              <MenuToolbarSkeleton />
              <CategoryTabsSkeleton />
            </>
          ) : (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <SearchBar
                  value={search}
                  onChange={setSearch}
                  resultCount={resultCount}
                />
                {data && (
                  <FilterDropdown
                    categories={data.categories}
                    value={filterCategory}
                    onChange={setFilterCategory}
                  />
                )}
              </div>
              {data && (
                <CategoryTabs
                  categories={data.categories}
                  activeId={activeCategory}
                  onSelect={handleTabSelect}
                />
              )}
            </>
          )}
        </div>
      </div>

      <section
        className="mx-auto max-w-[1400px] px-6 py-14 md:px-10 md:py-24 lg:px-16"
        aria-label="Menu categories"
      >
        {loading && <MenuGridSkeleton />}

        {error && !data && (
          <div className="rounded-[24px] border border-cocoa/10 bg-white/60 p-10 text-center">
            <p className="font-serif text-2xl text-cocoa">Menu unavailable</p>
            <p className="mt-3 text-cocoa/60">
              We couldn&apos;t load the menu right now. Please refresh the page or try again
              later.
            </p>
          </div>
        )}

        {!loading && !error && data && filteredCategories.length === 0 && (
          <div className="rounded-[24px] border border-cocoa/10 bg-white/60 p-12 text-center">
            <p className="font-serif text-2xl text-cocoa">
              {data.categories.length === 0 ? "Menu coming soon" : "No dishes found"}
            </p>
            <p className="mt-3 text-cocoa/60">
              {data.categories.length === 0
                ? "Our menu is being updated. Please check back shortly."
                : "Try a different search term or category filter."}
            </p>
          </div>
        )}

        {!loading && !error && data && (
          <div className="space-y-20 md:space-y-28">
            {filteredCategories.map((category, index) => (
              <CategorySection
                key={category.id}
                category={category}
                index={index}
              />
            ))}
          </div>
        )}

        {!loading && !error && data && filteredCategories.length > 0 && (
          <div className="mt-20 md:mt-28">
            <CTASection
              title="Ready to Experience Desi Dhamaka?"
              subtitle="Reserve Your Table Today"
              buttonLabel="Reserve Now"
              buttonTo="/reservation"
            />
          </div>
        )}
      </section>
    </div>
  );
}
