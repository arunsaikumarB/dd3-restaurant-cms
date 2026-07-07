import { memo, useMemo } from "react";
import type { ConciergeKnowledge } from "../../services/ai/cmsKnowledge";
import type { MessageStatus } from "../../services/conversation";
import type { CheffyAction } from "../../services/ai/actions";
import { readSessionPreferences } from "../../services/ai/sessionMemory";
import { buildAssistantPresentation } from "./presentation";
import { PresentationCards } from "./cards/PresentationCards";
import { CheffyActionBar } from "./CheffyActionBar";
import { FollowUpChips } from "./FollowUpChips";
import { MessageStreamRenderer } from "./MessageStreamRenderer";

type AssistantMessageGroupProps = {
  content: string;
  status?: MessageStatus;
  actions?: CheffyAction[];
  userMessage?: string;
  knowledge?: ConciergeKnowledge | null;
  onNavigate: (path: string) => void;
  onSwitchLocation?: (locationId: string) => void;
  onFollowUp?: (prompt: string) => void;
  isBusy?: boolean;
};

function renderMarkdown(raw: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const lines = escape(raw).split("\n");
  let html = "";
  let inList = false;
  for (const line of lines) {
    const bullet = line.match(/^\s*[•*-]\s+(.*)$/);
    if (bullet) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${bullet[1]}</li>`;
      continue;
    }
    if (inList) {
      html += "</ul>";
      inList = false;
    }
    if (line.trim()) html += `<p>${line}</p>`;
  }
  if (inList) html += "</ul>";

  return html
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
}

export const AssistantMessageGroup = memo(function AssistantMessageGroup({
  content,
  status = "complete",
  actions: storedActions,
  userMessage = "",
  knowledge = null,
  onNavigate,
  onSwitchLocation,
  onFollowUp,
  isBusy,
}: AssistantMessageGroupProps) {
  const isComplete = status === "complete";
  const isStreaming = status === "streaming" || status === "pending";

  const presentation = useMemo(
    () =>
      buildAssistantPresentation(content, {
        allowPartial: isStreaming,
        isComplete,
        userMessage,
        knowledge,
        sessionPrefs: readSessionPreferences(),
      }),
    [content, isStreaming, isComplete, userMessage, knowledge],
  );

  const displayActions = storedActions?.length ? storedActions : presentation.actions;
  const html = renderMarkdown(presentation.displayText);

  return (
    <div
      className={`cheffy-msg-group${isComplete ? " cheffy-msg-group--complete" : ""}`}
      aria-busy={isStreaming}
    >
      {presentation.displayText && (
        <MessageStreamRenderer html={html} status={status} />
      )}

      {isComplete && presentation.cards.length > 0 && (
        <PresentationCards cards={presentation.cards} onNavigate={onNavigate} />
      )}

      {isComplete && displayActions.length > 0 && (
        <CheffyActionBar
          actions={displayActions}
          onNavigate={onNavigate}
          onSwitchLocation={onSwitchLocation}
        />
      )}

      {isComplete && onFollowUp && presentation.followUps.length > 0 && (
        <FollowUpChips
          suggestions={presentation.followUps}
          onSelect={onFollowUp}
          disabled={isBusy}
        />
      )}
    </div>
  );
});
