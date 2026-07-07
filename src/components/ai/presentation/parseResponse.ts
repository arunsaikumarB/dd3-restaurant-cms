import { parseMessageActions, type ParseMessageActionsOptions } from "../../../services/ai/actions";
import type { CheffyAction } from "../../../services/ai/actions";

export const UI_ACTION_TOKEN_TYPES = [
  "BUTTON",
  "LINK",
  "PHONE",
  "MAP",
  "EMAIL",
  "ORDER",
  "ONLINE ORDERING",
  "RESERVATION",
  "CALL",
  "LOCATION",
  "MENU",
  "ACTION",
] as const;

export type ParseResponseOptions = ParseMessageActionsOptions;

/** Presentation-layer alias — delegates to the shared action parser. */
export function parseAssistantResponse(
  text: string,
  options: ParseResponseOptions = {},
): { displayText: string; actions: CheffyAction[] } {
  return parseMessageActions(text, options);
}
