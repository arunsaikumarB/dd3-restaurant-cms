import type { CheffyAction, CheffyActionType, ParsedMessageActions } from "./types";

/** Matches any internal action token: [TYPE:label|value] or [ACTION:kind:value] */
const ACTION_TOKEN_REGEX = /\[([A-Za-z][A-Za-z0-9_ ]*?):([^\]]+)\]/g;

/** Strips incomplete tokens at end of stream chunks, e.g. "[ONLINE ORDERING:Ord" */
const PARTIAL_TOKEN_SUFFIX = /\[(?:[A-Za-z][A-Za-z0-9_ ]*)?(?::[^\]]*)?$/;

/** Last-resort strip for any label|value bracket token that survived parsing */
const SAFETY_TOKEN_REGEX = /\[[^\]]+\|[^\]]+\]/g;

function actionId(type: CheffyActionType, label: string, value: string): string {
  return `${type}:${label}:${value}`;
}

function defaultLabel(type: CheffyActionType, value: string): string {
  switch (type) {
    case "phone":
      return "Call";
    case "email":
      return "Email";
    case "map":
      return "Directions";
    case "link":
      return "Open Link";
    case "reservation":
      return "Reserve a Table";
    case "order":
      return "Order Online";
    case "menu":
      return "View Live Menu";
    case "switch_location":
      return "Switch Location";
    default:
      return value.startsWith("http") ? "Open" : "Learn More";
  }
}

function parseLegacyAction(payload: string): CheffyAction | null {
  const colon = payload.indexOf(":");
  if (colon < 0) return null;

  const kind = payload.slice(0, colon).trim().toLowerCase();
  const value = payload.slice(colon + 1).trim();
  if (!value) return null;

  if (kind === "navigate") {
    const label = value.startsWith("http") ? "Open Link" : "Open";
    return {
      id: actionId("button", label, value),
      type: "button",
      label,
      value,
    };
  }

  if (kind === "switch_location") {
    return {
      id: actionId("switch_location", value, value),
      type: "switch_location",
      label: `View ${value.replace(/-/g, " ")}`,
      value,
    };
  }

  return null;
}

function normalizeTokenType(raw: string): CheffyActionType {
  const key = raw.trim().toUpperCase().replace(/\s+/g, "_");

  switch (key) {
    case "CALL":
      return "phone";
    case "LOCATION":
      return "map";
    case "ORDER":
    case "ONLINE_ORDERING":
      return "order";
    case "MENU":
      return "menu";
    case "BUTTON":
      return "button";
    case "LINK":
      return "link";
    case "PHONE":
      return "phone";
    case "MAP":
      return "map";
    case "EMAIL":
      return "email";
    case "RESERVATION":
      return "reservation";
    default:
      if (/ORDER|ONLINE/i.test(key)) return "order";
      if (/PHONE|CALL/i.test(key)) return "phone";
      if (/EMAIL|MAIL/i.test(key)) return "email";
      if (/MAP|LOCATION|DIRECTION/i.test(key)) return "map";
      if (/RESERV|BOOK|TABLE/i.test(key)) return "reservation";
      if (/MENU/i.test(key)) return "menu";
      return "button";
  }
}

function parseToken(typeRaw: string, payload: string): CheffyAction | null {
  const tokenType = typeRaw.trim().toUpperCase();

  if (tokenType === "ACTION") {
    return parseLegacyAction(payload);
  }

  const type = normalizeTokenType(typeRaw);
  const pipe = payload.indexOf("|");
  let label: string;
  let value: string;

  if (pipe >= 0) {
    label = payload.slice(0, pipe).trim();
    value = payload.slice(pipe + 1).trim();
  } else {
    value = payload.trim();
    label = defaultLabel(type, value);
  }

  if (!value) return null;

  return {
    id: actionId(type, label, value),
    type,
    label,
    value,
  };
}

function dedupeActions(actions: CheffyAction[]): CheffyAction[] {
  const seen = new Set<string>();
  const result: CheffyAction[] = [];
  for (const action of actions) {
    if (seen.has(action.id)) continue;
    seen.add(action.id);
    result.push(action);
  }
  return result;
}

function stripTrailingPartialTokens(text: string): string {
  return text.replace(PARTIAL_TOKEN_SUFFIX, "").trimEnd();
}

function safetyStripMarkup(text: string): string {
  return text.replace(SAFETY_TOKEN_REGEX, "").replace(/\n{3,}/g, "\n\n").trim();
}

export type ParseMessageActionsOptions = {
  /** When true, hides incomplete tokens at the end of a streaming chunk. */
  allowPartial?: boolean;
};

/**
 * Parses internal LLM/CMS action tokens and returns guest-safe display text.
 * Action markup is never returned in `displayText`.
 */
export function parseMessageActions(
  text: string,
  options: ParseMessageActionsOptions = {},
): ParsedMessageActions {
  const actions: CheffyAction[] = [];
  let displayText = text;

  displayText = displayText.replace(ACTION_TOKEN_REGEX, (_match, typeRaw: string, payload: string) => {
    const action = parseToken(typeRaw, payload);
    if (action) actions.push(action);
    return "";
  });

  displayText = safetyStripMarkup(displayText);

  displayText = displayText
    .split("\n")
    .map((line) => line.replace(/\s{2,}/g, " ").trimEnd())
    .filter((line) => line.trim().length > 0 || line === "")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (options.allowPartial) {
    displayText = stripTrailingPartialTokens(displayText);
  }

  displayText = safetyStripMarkup(displayText);

  return {
    displayText,
    actions: dedupeActions(actions),
  };
}

/** Strips any action token markup from text (for streaming safety). */
export function stripActionMarkup(text: string, allowPartial = false): string {
  return parseMessageActions(text, { allowPartial }).displayText;
}
