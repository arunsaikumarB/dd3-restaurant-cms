import { memo, useMemo, useState } from "react";
import type { ConciergeKnowledge } from "../../services/ai/cmsKnowledge";
import type { MessageStatus } from "../../services/conversation";
import type { CheffyAction } from "../../services/ai/actions";
import type { KnowledgeFeedbackType } from "../../types/knowledgeIntelligence";
import { readSessionPreferences } from "../../services/ai/sessionMemory";
import { submitKnowledgeFeedback } from "../../services/knowledgeIntelligence/feedback";
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
  conversationId?: string;
  locationId?: string;
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

const FEEDBACK_OPTIONS: Array<{ type: KnowledgeFeedbackType; label: string }> = [
  { type: "helpful", label: "Helpful" },
  { type: "not_helpful", label: "Not Helpful" },
  { type: "incorrect", label: "Incorrect" },
  { type: "missing_information", label: "Missing Info" },
  { type: "needs_human", label: "Needs Human" },
];

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
  conversationId,
  locationId,
}: AssistantMessageGroupProps) {
  const isComplete = status === "complete";
  const isStreaming = status === "streaming" || status === "pending";
  const [feedbackSent, setFeedbackSent] = useState<KnowledgeFeedbackType | null>(null);
  const [feedbackBusy, setFeedbackBusy] = useState(false);

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

  const sendFeedback = async (type: KnowledgeFeedbackType) => {
    if (!userMessage.trim() || feedbackSent || feedbackBusy) return;
    setFeedbackBusy(true);
    try {
      await submitKnowledgeFeedback({
        question: userMessage,
        response: content,
        feedbackType: type,
        rating: type === "helpful" ? 5 : type === "not_helpful" ? 2 : 1,
        conversationId:
          conversationId ??
          (typeof sessionStorage !== "undefined"
            ? sessionStorage.getItem("cheffy_conversation_id") ?? undefined
            : undefined),
        locationId: locationId ?? knowledge?.locationId,
      });
      setFeedbackSent(type);
    } catch {
      /* ignore offline / migration-not-applied */
    } finally {
      setFeedbackBusy(false);
    }
  };

  return (
    <div
      className={`cheffy-msg-group${isComplete ? " cheffy-msg-group--complete" : ""}`}
      aria-busy={isStreaming}
    >
      {presentation.displayText && <MessageStreamRenderer html={html} status={status} />}

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
        <FollowUpChips suggestions={presentation.followUps} onSelect={onFollowUp} disabled={isBusy} />
      )}

      {isComplete && userMessage.trim() && (
        <div className="cheffy-feedback" aria-label="Rate this answer">
          {feedbackSent ? (
            <p className="cheffy-feedback__thanks">Thanks for the feedback</p>
          ) : (
            FEEDBACK_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                type="button"
                className="cheffy-feedback__btn"
                disabled={feedbackBusy}
                onClick={() => void sendFeedback(opt.type)}
              >
                {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
});
