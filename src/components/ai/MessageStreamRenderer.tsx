import type { MessageStatus } from "../../services/conversation";

type MessageStreamRendererProps = {
  html: string;
  status?: MessageStatus;
};

export function MessageStreamRenderer({ html, status }: MessageStreamRendererProps) {
  const streaming = status === "streaming" || status === "pending";

  return (
    <div
      className={`cheffy-msg__bubble cheffy-msg__bubble--stream${streaming ? " is-streaming" : ""}`}
      aria-live={streaming ? "polite" : undefined}
    >
      <span dangerouslySetInnerHTML={{ __html: html }} />
      {streaming && <span className="cheffy-msg__cursor" aria-hidden="true" />}
    </div>
  );
}
