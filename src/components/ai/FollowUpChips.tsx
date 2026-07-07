import type { FollowUpSuggestion } from "./presentation/types";

type FollowUpChipsProps = {
  suggestions: FollowUpSuggestion[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

export function FollowUpChips({ suggestions, onSelect, disabled }: FollowUpChipsProps) {
  if (!suggestions.length) return null;

  return (
    <div className="cheffy-followups" role="group" aria-label="Suggested follow-up questions">
      <p className="cheffy-followups__lead">Happy to help! Would you like to…</p>
      <div className="cheffy-followups__chips">
        {suggestions.map((item, i) => (
          <button
            key={item.id}
            type="button"
            className="cheffy-followups__chip"
            style={{ animationDelay: `${120 + i * 60}ms` }}
            onClick={() => onSelect(item.prompt)}
            disabled={disabled}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
