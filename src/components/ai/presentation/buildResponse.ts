import type { CMSKnowledge } from "../../../services/cms/knowledge";
import type { AISessionContext } from "../../../services/ai/types";
import { condenseDisplayText } from "./condenseText";
import { inferPresentationCards } from "./inferCards";
import { parseMessageActions } from "../../../services/ai/actions";
import { suggestFollowUps } from "./suggestFollowUps";
import type { ParsedAssistantResponse } from "./types";

export type BuildResponseOptions = {
  allowPartial?: boolean;
  isComplete?: boolean;
  userMessage?: string;
  knowledge?: CMSKnowledge | null;
  sessionPrefs?: AISessionContext["preferences"];
};

export function buildAssistantPresentation(
  rawText: string,
  options: BuildResponseOptions = {},
): ParsedAssistantResponse {
  const { displayText: parsedText, actions } = parseMessageActions(rawText, {
    allowPartial: options.allowPartial,
  });

  const isComplete = options.isComplete ?? !options.allowPartial;
  const displayText = condenseDisplayText(parsedText, isComplete);

  const userMessage = options.userMessage ?? "";
  const knowledge = options.knowledge ?? null;
  const cards = isComplete && userMessage ? inferPresentationCards(userMessage, knowledge, options.sessionPrefs) : [];
  const followUps =
    isComplete && userMessage
      ? suggestFollowUps(userMessage, knowledge, options.sessionPrefs)
      : [];

  return { displayText, actions, cards, followUps };
}
