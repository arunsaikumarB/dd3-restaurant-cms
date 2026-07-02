import { useNavigate } from "react-router-dom";
import { LOCATION_OPTIONS, getLocationConfig, type LocationId } from "../config/locations";
import LocationOptionCard from "../components/location/LocationOptionCard";
import { LOGO } from "../constants/logo";
import { locPath } from "../utils/locationPaths";
import { useLocationSelection } from "../context/LocationContext";

/**
 * Landing page at "/". Always shows the location picker — visiting "/"
 * directly never auto-redirects to a remembered location, so the URL
 * always reflects the chosen location once picked.
 */
export default function LocationGatePage() {
  const navigate = useNavigate();
  const { setLocation } = useLocationSelection();

  const handleSelect = (locationId: LocationId) => {
    setLocation(locationId);
    navigate(locPath(locationId, "/"));
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-cocoa px-6 py-16">
      <img src={LOGO.onDark} alt={LOGO.alt} className="mb-8 h-14 w-auto object-contain" />
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-primary">
          Choose Location
        </p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-cocoa">
          Select a Desi Dhamaka Location
        </h1>
        <p className="mt-2 text-sm text-cocoa/60">
          We&apos;ll show you the menu, pricing, offers and booking links for your location.
        </p>
        <div className="mt-6 space-y-2" role="listbox" aria-label="Restaurant locations">
          {LOCATION_OPTIONS.map((option) => (
            <LocationOptionCard
              key={option.id}
              option={{
                ...option,
                address: option.address || getLocationConfig(option.id).address,
              }}
              selected={false}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
