import { useCallback, useEffect, useMemo, useState } from "react";
import PageHero from "../components/ui/PageHero";
import CategorySection from "../components/menu/CategorySection";
import CategoryTabs from "../components/menu/CategoryTabs";
import FilterDropdown from "../components/menu/FilterDropdown";
import {
  CategoryTabsSkeleton,
  MenuGridSkeleton,
  MenuToolbarSkeleton,
} from "../components/menu/MenuSkeleton";
import SearchBar from "../components/menu/SearchBar";
import CTASection from "../components/ui/CTASection";
import { NAV_BAR_HEIGHT } from "../constants/navigation";
import {
  isDirectOrderingMode,
  redirectToChefGaaOrder,
  useLocationOrderUrl,
  useMenuExperience,
} from "../demo/menuExperience";
import { usePageContent } from "../context/PageContentContext";
import { useMenuData } from "../hooks/useMenuData";
import { filterMenuData, flattenItems } from "../utils/menu";
import { useLocationSelection } from "../context/LocationContext";
import { useSectionImage } from "../hooks/useGallerySection";
import { isExternalUrl } from "../utils/locationLinks";

export default function MenuPage() {
  const { fetchSection, interpolate } = usePageContent();
  const { selectedLocationId } = useLocationSelection();
  const { mode: menuExperienceMode } = useMenuExperience();
  const chefGaaOrderUrl = useLocationOrderUrl();
  const directMenuOrdering = isDirectOrderingMode(menuExperienceMode);
  const menuHeroImage = useSectionImage("menu_hero", "/showcase/biryani.webp");
  const { data, loading, error } = useMenuData(selectedLocationId);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const hero = fetchSection("menu", "hero", {
    label: "The Menu",
    title: "Menu",
    subtitleTemplate:
      "Discover authentic Indian flavours crafted with tradition, premium ingredients and unforgettable taste at {location}.",
  });
  const emptyStates = fetchSection("menu", "empty_states", {
    unavailableTitle: "Menu unavailable",
    unavailableBody:
      "We couldn't load the menu right now. Please refresh the page or try again later.",
    comingSoonTitle: "Menu coming soon",
    comingSoonBody: "Our menu is being updated. Please check back shortly.",
    noResultsTitle: "No dishes found",
    noResultsBody: "Try a different search term or category filter.",
  });
  const heroSubtitle = interpolate(hero.subtitleTemplate);
  const cta = fetchSection("menu", "cta", {
    title: "Ready to Experience Desi Dhamaka?",
    subtitle: "Reserve Your Table Today",
    cta: { label: "Reserve Now", url: "/reservation" },
  });

  const filteredCategories = useMemo(() => {
    if (!data) return [];
    return filterMenuData(data, search, filterCategory);
  }, [data, search, filterCategory]);

  const resultCount = useMemo(
    () => flattenItems(filteredCategories).length,
    [filteredCategories],
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
      { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.15, 0.35, 0.55] },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [data, filterCategory, search]);

  useEffect(() => {
    if (filterCategory) setActiveCategory(filterCategory);
    if (search.trim()) setActiveCategory(null);
  }, [filterCategory, search]);

  useEffect(() => {
    if (!directMenuOrdering) return;
    redirectToChefGaaOrder(chefGaaOrderUrl);
  }, [chefGaaOrderUrl, directMenuOrdering]);

  if (directMenuOrdering) {
    return null;
  }

  return (
    <div className="min-h-screen bg-ivory">
      <PageHero
        label={hero.label}
        title={hero.title}
        subtitle={heroSubtitle}
        backgroundImage={menuHeroImage}
        breadcrumbItems={[
          { label: "Home", to: "/" },
          { label: "Menu" },
        ]}
      />

      <div
        className="sticky z-40 mt-8 border-b border-cocoa/8 bg-ivory/96 shadow-[0_2px_16px_-4px_rgba(43,29,24,0.06)] backdrop-blur-xl md:mt-10"
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
            <p className="font-serif text-2xl text-cocoa">{emptyStates.unavailableTitle}</p>
            <p className="mt-3 text-cocoa/60">{emptyStates.unavailableBody}</p>
          </div>
        )}

        {!loading && !error && data && filteredCategories.length === 0 && (
          <div className="rounded-[24px] border border-cocoa/10 bg-white/60 p-12 text-center">
            <p className="font-serif text-2xl text-cocoa">
              {data.categories.length === 0
                ? emptyStates.comingSoonTitle
                : emptyStates.noResultsTitle}
            </p>
            <p className="mt-3 text-cocoa/60">
              {data.categories.length === 0
                ? emptyStates.comingSoonBody
                : emptyStates.noResultsBody}
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
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pb-24 md:px-10 lg:px-16">
        <CTASection
          title={cta.title}
          subtitle={cta.subtitle}
          buttonLabel={cta.cta.label}
          buttonTo={isExternalUrl(cta.cta.url) ? undefined : cta.cta.url}
          buttonHref={isExternalUrl(cta.cta.url) ? cta.cta.url : undefined}
        />
      </section>
    </div>
  );
}
