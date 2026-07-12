import { useMemo } from "react";
import type { MessageStatus } from "../../services/conversation";
import type { ConciergeKnowledge } from "../../services/ai/cmsKnowledge";
import type { CheffyAction } from "../../services/ai/actions";
import { AssistantMessageGroup } from "./AssistantMessageGroup";

type MessageBubbleProps = {
  content: string;
  role: "user" | "assistant";
  status?: MessageStatus;
  actions?: CheffyAction[];
  userMessage?: string;
  knowledge?: ConciergeKnowledge | null;
  onNavigate?: (path: string) => void;
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

export function MessageBubble({
  content,
  role,
  status = "complete",
  actions,
  userMessage,
  knowledge,
  onNavigate,
  onSwitchLocation,
  onFollowUp,
  isBusy,
  conversationId,
  locationId,
}: MessageBubbleProps) {
  const userHtml = useMemo(() => renderMarkdown(content), [content]);

  if (role === "assistant" && onNavigate) {
    return (
      <div className="cheffy-msg cheffy-msg--assistant cheffy-msg--animate-in">
        <AssistantMessageGroup
          content={content}
          status={status}
          actions={actions}
          userMessage={userMessage}
          knowledge={knowledge}
          onNavigate={onNavigate}
          onSwitchLocation={onSwitchLocation}
          onFollowUp={onFollowUp}
          isBusy={isBusy}
          conversationId={conversationId}
          locationId={locationId}
        />
      </div>
    );
  }

  return (
    <div className={`cheffy-msg cheffy-msg--${role} cheffy-msg--animate-in`}>
      <div
        className="cheffy-msg__bubble"
        dangerouslySetInnerHTML={{ __html: userHtml }}
      />
    </div>
  );
}
