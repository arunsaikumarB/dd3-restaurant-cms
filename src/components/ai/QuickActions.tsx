export type QuickAction = {
  label: string;
  prompt: string;
};

export const QUICK_ACTIONS: QuickAction[] = [
  { label: "🍛 Recommend Food", prompt: "Can you recommend some popular dishes?" },
  { label: "📅 Reserve Table", prompt: "I'd like to reserve a table." },
  { label: "🛵 Order Online", prompt: "I want to order online." },
  { label: "🎉 Catering", prompt: "Tell me about catering options." },
  { label: "📍 Locations", prompt: "What are your locations?" },
  { label: "❓ Ask Anything", prompt: "What can you help me with?" },
];

type QuickActionsProps = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

export function QuickActions({ onSelect, disabled }: QuickActionsProps) {
  return (
    <div className="cheffy-quick" role="group" aria-label="Quick actions">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.label}
          type="button"
          className="cheffy-quick__btn"
          onClick={() => onSelect(action.prompt)}
          disabled={disabled}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
