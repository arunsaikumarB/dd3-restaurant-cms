import type { LocationId } from "../../../config/locations";
import type { CMSKnowledge } from "../../cms/knowledge";
import type { CheffyIntent } from "../emotionEngine";

/** Active concierge tools — plug-and-play via registry. */
export type ToolName =
  | "getRestaurantInfo"
  | "getHomepageContent"
  | "getOffers"
  | "getGallery"
  | "getReviews"
  | "getSEO"
  | "getCurrentLocation"
  | "navigateToPage";

/** @deprecated Legacy alias — mapped to canonical ToolName at runtime. */
export type LegacyToolName =
  | "getRestaurantSettings"
  | "getHomepage"
  | ToolName;

export type ToolPriority = 1 | 2 | 3;

export type ToolExecutionContext = {
  message: string;
  knowledge: CMSKnowledge;
  locationId: LocationId;
  conversationId?: string;
};

export type ToolExecutionResult = {
  tool: ToolName;
  available: boolean;
  data: unknown;
  cached?: boolean;
  durationMs?: number;
};

export type ToolDefinition = {
  name: ToolName;
  description: string;
  priority: ToolPriority;
  intents: CheffyIntent[];
  cacheable: boolean;
  execute: (ctx: ToolExecutionContext) => ToolExecutionResult;
};

export type ToolPlan = {
  intents: CheffyIntent[];
  tools: ToolName[];
};

export type ToolExecutorOptions = {
  message: string;
  knowledge: CMSKnowledge;
  conversationId?: string;
  toolNames?: ToolName[];
};

export type ToolLogEntry = {
  conversationId?: string;
  tool: ToolName;
  locationId: LocationId;
  durationMs: number;
  success: boolean;
  cached: boolean;
};
