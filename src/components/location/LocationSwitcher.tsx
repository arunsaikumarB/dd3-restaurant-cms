import { useLocationSelection } from "../../context/LocationContext";
import LocationDropdown from "./LocationDropdown";

type Props = {
  variant?: "navbar" | "header" | "full";
  tone?: "light" | "dark";
  className?: string;
};

export default function LocationSwitcher({
  variant = "header",
  tone = "light",
  className = "",
}: Props) {
  const { selectedLocationId, options, setLocation } = useLocationSelection();

  return (
    <LocationDropdown
      options={options}
      selectedLocationId={selectedLocationId}
      onSelect={setLocation}
      variant={variant}
      tone={tone}
      className={className}
    />
  );
}
