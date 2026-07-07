import type { CheffyActionItem } from "./cheffyActions";
import { INPUT_QUICK_CHIPS } from "./cheffyActions";

type QuickActionChipsProps = {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
  chips?: CheffyActionItem[];
};

export function QuickActionChips({ onSelect, disabled, chips = INPUT_QUICK_CHIPS }: QuickActionChipsProps) {
  return (
    <div className="cheffy-input-chips" role="toolbar" aria-label="Quick actions">
      <div className="cheffy-input-chips__scroll">
        {chips.map((chip) => (
          <button
            key={`${chip.label}-${chip.prompt}`}
            type="button"
            className="cheffy-input-chips__chip"
            onClick={() => onSelect(chip.prompt)}
            disabled={disabled}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}
