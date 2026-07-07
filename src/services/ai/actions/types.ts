/** Supported concierge action token types (extensible). */
export type CheffyActionType =
  | "button"
  | "link"
  | "phone"
  | "map"
  | "email"
  | "reservation"
  | "order"
  | "menu"
  | "switch_location";

export type CheffyAction = {
  id: string;
  type: CheffyActionType;
  label: string;
  value: string;
};

export type ParsedMessageActions = {
  /** Text safe to render — all action tokens removed. */
  displayText: string;
  actions: CheffyAction[];
};

export const KNOWN_ACTION_TOKEN_TYPES = [
  "BUTTON",
  "LINK",
  "PHONE",
  "MAP",
  "EMAIL",
  "RESERVATION",
  "ORDER",
  "ONLINE ORDERING",
  "MENU",
  "CALL",
  "LOCATION",
  "ACTION",
] as const;

export type KnownActionTokenType = (typeof KNOWN_ACTION_TOKEN_TYPES)[number];
