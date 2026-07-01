import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { resolvePublicLocationId, type LocationId } from "../config/locations";
import type { PageContentPageKey } from "../config/pageContentSchema";
import { useHomepageData } from "../hooks/useHomepageData";
import {
  fetchPageContentMap,
  getPageContentSectionFromMap,
  type PageContentSectionKey,
} from "../services/pageContentPublic";
import { mergePageContentSection } from "../utils/pageContentMerge";
import {
  buildPageContentTemplateVars,
  interpolatePageContent,
  type PageContentTemplateVars,
} from "../utils/pageContentTemplate";
import { useLocationSelection } from "./LocationContext";

type PageContentMap = Map<PageContentSectionKey, Record<string, unknown>>;

type PageContentContextValue = {
  locationId: LocationId;
  isLoading: boolean;
  fetchSection: <T extends Record<string, unknown>>(
    page: PageContentPageKey | string,
    section: string,
    fallbacks: T,
  ) => T;
  interpolate: (template: string, extra?: PageContentTemplateVars) => string;
  templateVars: PageContentTemplateVars;
};

const PageContentContext = createContext<PageContentContextValue | null>(null);

export function PageContentProvider({ children }: { children: ReactNode }) {
  const { selectedLocation, selectedLocationId } = useLocationSelection();
  const { bundle } = useHomepageData();
  const locationId = resolvePublicLocationId(selectedLocationId);
  const [contentMap, setContentMap] = useState<PageContentMap>(() => new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const map = await fetchPageContentMap(locationId);
        if (!cancelled) {
          setContentMap(map);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [locationId]);

  const templateVars = useMemo(
    () =>
      buildPageContentTemplateVars({
        restaurantName: bundle.settings.restaurant_name,
        locationName: selectedLocation?.name,
        locationShortName: selectedLocation?.shortName,
      }),
    [bundle.settings.restaurant_name, selectedLocation?.name, selectedLocation?.shortName],
  );

  const interpolate = useCallback(
    (template: string, extra?: PageContentTemplateVars) =>
      interpolatePageContent(template, { ...templateVars, ...extra }),
    [templateVars],
  );

  const fetchSection = useCallback(
    <T extends Record<string, unknown>>(
      page: PageContentPageKey | string,
      section: string,
      fallbacks: T,
    ): T => {
      const dbContent = getPageContentSectionFromMap(contentMap, page, section);
      return mergePageContentSection(fallbacks, dbContent);
    },
    [contentMap],
  );

  const value = useMemo(
    () => ({
      locationId,
      isLoading,
      fetchSection,
      interpolate,
      templateVars,
    }),
    [locationId, isLoading, fetchSection, interpolate, templateVars],
  );

  return (
    <PageContentContext.Provider value={value}>{children}</PageContentContext.Provider>
  );
}

export function usePageContent() {
  const context = useContext(PageContentContext);
  if (!context) {
    throw new Error("usePageContent must be used within PageContentProvider");
  }
  return context;
}
