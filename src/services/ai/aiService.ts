import type { ReplyButton } from "../conversation";
import type { CheffyAction } from "./actions";
import { parseMessageActions } from "./actions";

export type ConciergeAction =
  | { type: "navigate"; path: string }
  | { type: "switch_location"; locationId: string };

export type ReplyResult = {
  text: string;
  actions: ConciergeAction[];
  /** Parsed UI actions for message rendering. */
  uiActions: CheffyAction[];
  /** @deprecated Use uiActions */
  buttons: ReplyButton[];
};

/** Parses internal action tokens from assistant/CMS text. */
export function parseActions(text: string): ReplyResult {
  const { displayText, actions: uiActions } = parseMessageActions(text);

  const legacyActions: ConciergeAction[] = [];
  const buttons: ReplyButton[] = [];

  for (const action of uiActions) {
    if (action.type === "switch_location") {
      legacyActions.push({ type: "switch_location", locationId: action.value });
      continue;
    }
    legacyActions.push({ type: "navigate", path: action.value });
    if (action.type === "button" || action.type === "reservation" || action.type === "link") {
      buttons.push({ label: action.label, path: action.value });
    }
  }

  return { text: displayText, actions: legacyActions, uiActions, buttons };
}
