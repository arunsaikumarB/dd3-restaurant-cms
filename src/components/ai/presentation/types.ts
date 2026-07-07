import type { CMSOffer, CMSHoursRow } from "../../../services/cms/knowledge/types";
import type { CheffyAction } from "../../../services/ai/actions";

export type PresentationCard =
  | {
      kind: "offer";
      offers: CMSOffer[];
      offerPath: string;
      orderPath: string;
    }
  | {
      kind: "location";
      name: string;
      address: string;
      phone: string;
      hours: CMSHoursRow[];
      mapsUrl?: string;
      orderUrl?: string;
      websitePath?: string;
    }
  | {
      kind: "contact";
      phone: string;
      email: string;
      address: string;
      mapsUrl?: string;
    }
  | {
      kind: "recommendation";
      items: Array<{
        id: string;
        emoji: string;
        title: string;
        tag: string;
      }>;
      menuPath: string;
    };

export type FollowUpSuggestion = {
  id: string;
  label: string;
  prompt: string;
};

export type ParsedAssistantResponse = {
  displayText: string;
  actions: CheffyAction[];
  cards: PresentationCard[];
  followUps: FollowUpSuggestion[];
};

export type ConversationTopic =
  | "offers"
  | "location"
  | "contact"
  | "hours"
  | "menu"
  | "recommend"
  | "catering"
  | "gallery"
  | "reviews"
  | "reservation"
  | "order"
  | "general";
