import { useNavigate } from "react-router-dom";
import { useLocationSelection } from "../../context/LocationContext";
import { locPath } from "../../utils/locationPaths";
import type { LocationId } from "../../config/locations";
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
  const navigate = useNavigate();
  const { selectedLocationId, options, setLocation } = useLocationSelection();

  const handleSelect = (locationId: LocationId) => {
    setLocation(locationId);
    navigate(locPath(locationId, "/"));
  };

  return (
    <LocationDropdown
      options={options}
      selectedLocationId={selectedLocationId}
      onSelect={handleSelect}
      variant={variant}
      tone={tone}
      className={className}
    />
  );
}
