export type PageContentTemplateVars = Record<string, string | number | undefined>;

/**
 * Replace `{name}`, `{location}`, etc. in CMS template strings.
 * Unknown placeholders are left as-is.
 */
export function interpolatePageContent(
  template: string,
  vars: PageContentTemplateVars,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    if (value === undefined || value === null || value === "") {
      return match;
    }
    return String(value);
  });
}

export function buildPageContentTemplateVars(options: {
  restaurantName?: string;
  locationName?: string;
  locationShortName?: string;
  guests?: string | number;
  extra?: PageContentTemplateVars;
}): PageContentTemplateVars {
  const name = options.restaurantName?.trim() || "";
  const location =
    options.locationShortName?.trim() ||
    options.locationName?.trim() ||
    "";
  return {
    name,
    location,
    shortName: options.locationShortName?.trim() || location,
    guests: options.guests,
    ...options.extra,
  };
}
