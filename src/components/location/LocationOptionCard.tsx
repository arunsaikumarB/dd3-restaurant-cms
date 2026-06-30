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
    ? "bg-orange-50 border border-orange-300"
    : highlighted
      ? "bg-orange-50 border border-orange-200"
      : "border border-transparent hover:bg-orange-50";

  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={selected}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-xl p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 ${stateClass}`}
      onClick={() => onSelect(option.id)}
    >
      <span
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-orange-100"
        aria-hidden
      >
        <MapPin size={18} color="#ea580c" strokeWidth={1.75} />
      </span>
      <span className="flex-1 text-base font-semibold text-gray-900">{option.name}</span>
      {selected && (
        <Check size={18} color="#ea580c" strokeWidth={2} className="flex-shrink-0" aria-hidden />
      )}
    </button>
  );
}
