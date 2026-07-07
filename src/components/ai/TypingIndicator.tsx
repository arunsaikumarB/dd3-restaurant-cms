export function TypingIndicator({ label = "Cheffy is thinking…" }: { label?: string }) {
  return (
    <div className="cheffy-typing" aria-live="polite" aria-label={label}>
      <span className="cheffy-typing__label">{label}</span>
      <span className="cheffy-typing__dots" aria-hidden="true">
        <span className="cheffy-typing__dot" />
        <span className="cheffy-typing__dot" />
        <span className="cheffy-typing__dot" />
      </span>
    </div>
  );
}
