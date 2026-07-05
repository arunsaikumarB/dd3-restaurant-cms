import { Check, MapPin } from "lucide-react";
import type { LocationId } from "../../config/locations";

export type LocationOption = {
  id: LocationId;
  name: string;
  address: string;
};

type Props = {
  option: LocationOption;
  selected: boolean;
  highlighted?: boolean;
  onSelect: (id: LocationId) => void;
  id?: string;
};

export default function LocationOptionCard({
  option,
  selected,
  highlighted = false,
  onSelect,
  id,
}: Props) {
  const stateClass = selected
    ? " location-option--selected"
    : highlighted
      ? " location-option--highlighted"
      : "";

  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={selected}
      title={option.name}
      className={`location-option${stateClass}`}
      onClick={() => onSelect(option.id)}
    >
      <span className="location-option__icon" aria-hidden>
        <MapPin size={16} strokeWidth={1.75} />
      </span>
      <span className="location-option__label">{option.name}</span>
      <span className="location-option__check" aria-hidden>
        {selected ? <Check size={16} strokeWidth={2.25} /> : null}
      </span>
    </button>
  );
}
