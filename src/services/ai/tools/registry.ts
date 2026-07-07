import type { CheffyIntent } from "../emotionEngine";
import { TOOL_HANDLERS } from "./handlers";
import type { ToolDefinition, ToolName } from "./types";

const INTENT_TOOLS: Record<CheffyIntent, ToolName[]> = {
  hours: ["getRestaurantInfo", "getCurrentLocation"],
  offers: ["getOffers", "getCurrentLocation"],
  contact: ["getRestaurantInfo", "getCurrentLocation"],
  order: ["getRestaurantInfo", "getCurrentLocation", "navigateToPage"],
  reservation: ["getRestaurantInfo", "getSEO", "navigateToPage"],
  catering: ["getSEO", "getHomepageContent", "navigateToPage"],
  party: ["getSEO", "getHomepageContent", "navigateToPage"],
  location: ["getCurrentLocation", "getRestaurantInfo"],
  greeting: ["getHomepageContent", "getSEO", "getCurrentLocation"],
  faq: [
    "getRestaurantInfo",
    "getHomepageContent",
    "getOffers",
    "getGallery",
    "getReviews",
    "getSEO",
    "getCurrentLocation",
  ],
  gallery: ["getGallery", "getSEO"],
  buffet: ["getRestaurantInfo", "getSEO", "getCurrentLocation"],
  menu: ["navigateToPage"],
  vegetarian: ["navigateToPage"],
  recommend: ["navigateToPage"],
  kids: ["navigateToPage"],
  unknown: ["getHomepageContent", "getOffers", "getCurrentLocation"],
};

const TOOL_PRIORITY: Record<ToolName, ToolDefinition["priority"]> = {
  getRestaurantInfo: 1,
  getOffers: 1,
  getCurrentLocation: 1,
  navigateToPage: 1,
  getHomepageContent: 2,
  getGallery: 2,
  getReviews: 2,
  getSEO: 2,
};

const TOOL_CACHEABLE: Record<ToolName, boolean> = {
  getRestaurantInfo: true,
  getHomepageContent: true,
  getOffers: false,
  getGallery: true,
  getReviews: false,
  getSEO: true,
  getCurrentLocation: true,
  navigateToPage: false,
};

const TOOL_DESCRIPTIONS: Record<ToolName, string> = {
  getRestaurantInfo: "Restaurant name, hours, address, phone, email, website, and social links",
  getHomepageContent: "Hero, about, story, features, and homepage highlights",
  getOffers: "Current offers, details, validity badges, and CTA links",
  getGallery: "Gallery images, categories, and featured photos",
  getReviews: "Guest ratings, testimonials, and featured reviews",
  getSEO: "Page metadata and keywords from SEO CMS",
  getCurrentLocation: "Active outlet (South Plainfield, Oak Tree, or Lawrenceville)",
  navigateToPage: "In-site navigation for menu, offers, order, catering, and more",
};

function buildDefinition(name: ToolName): ToolDefinition {
  const intents = (Object.entries(INTENT_TOOLS) as Array<[CheffyIntent, ToolName[]]>)
    .filter(([, tools]) => tools.includes(name))
    .map(([intent]) => intent);

  return {
    name,
    description: TOOL_DESCRIPTIONS[name],
    priority: TOOL_PRIORITY[name],
    intents,
    cacheable: TOOL_CACHEABLE[name],
    execute: TOOL_HANDLERS[name],
  };
}

const ALL_TOOL_NAMES = Object.keys(TOOL_HANDLERS) as ToolName[];

const registry = new Map<ToolName, ToolDefinition>(
  ALL_TOOL_NAMES.map((name) => [name, buildDefinition(name)]),
);

export function registerTool(definition: ToolDefinition): void {
  registry.set(definition.name, definition);
}

export function getToolDefinition(name: ToolName): ToolDefinition | undefined {
  return registry.get(name);
}

export function listRegisteredTools(): ToolDefinition[] {
  return [...registry.values()].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

export function getToolsForIntents(intents: CheffyIntent[]): ToolName[] {
  const selected = new Set<ToolName>();
  for (const intent of intents) {
    for (const tool of INTENT_TOOLS[intent] ?? INTENT_TOOLS.unknown) {
      selected.add(tool);
    }
  }

  return [...selected].sort((a, b) => {
    const priorityDiff = TOOL_PRIORITY[a] - TOOL_PRIORITY[b];
    if (priorityDiff !== 0) return priorityDiff;
    return a.localeCompare(b);
  });
}

export const TOOL_DEFINITIONS = listRegisteredTools().map((tool) => ({
  name: tool.name,
  description: tool.description,
  priority: tool.priority,
  cacheable: tool.cacheable,
}));

/** @deprecated Legacy names for backward compatibility. */
export const LEGACY_TOOL_ALIASES: Record<string, ToolName> = {
  getRestaurantSettings: "getRestaurantInfo",
  getHomepage: "getHomepageContent",
};

export { INTENT_TOOLS };
