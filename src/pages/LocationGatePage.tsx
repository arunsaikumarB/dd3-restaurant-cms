import { useNavigate } from "react-router-dom";
import {
  LOCATION_IDS,
  getLocationConfig,
  type LocationId,
} from "../config/locations";
import PremiumLocationCard from "../components/location/PremiumLocationCard";
import { LOGO } from "../constants/logo";
import { locPath } from "../utils/locationPaths";
import { useLocationSelection } from "../context/LocationContext";

/** Full-bleed ambience image behind the picker. */
const GATE_BACKGROUND = "/hero/hero-poster.webp";

/** Per-location card imagery (decorative only). */
const LOCATION_IMAGES: Record<LocationId, string> = {
  "south-plainfield": "/showcase/biryani.webp",
  "oak-tree": "/showcase/tandoori.webp",
  lawrenceville: "/showcase/butter-chicken.webp",
};

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
    <div className="relative flex h-screen flex-col overflow-hidden bg-cocoa">
      {/* Ambience background */}
      <div className="absolute inset-0" aria-hidden>
        <img
          src={GATE_BACKGROUND}
          alt=""
          className="h-full w-full scale-105 object-cover blur-[3px]"
          decoding="async"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-cocoa/80" />
        <div className="absolute inset-0 bg-gradient-to-b from-cocoa/70 via-cocoa/60 to-cocoa/90" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl flex-col items-center justify-center px-6 py-8">
        <header className="flex flex-col items-center text-center">
          <img
            src={LOGO.onDark}
            alt={LOGO.alt}
            className="h-14 w-auto object-contain sm:h-16"
            decoding="async"
          />
          <h1 className="mt-6 whitespace-nowrap font-serif text-[clamp(1.5rem,4.5vw,3rem)] font-semibold text-white">
            Choose Your Nearest Restaurant
          </h1>
          <p className="mt-3 whitespace-nowrap text-[clamp(0.7rem,1.8vw,1rem)] leading-relaxed text-white/70">
            Select a location to explore menus, online ordering, reservations and exclusive offers.
          </p>
        </header>

        <div
          className="mt-10 grid w-full grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3 lg:gap-10"
          role="list"
          aria-label="Restaurant locations"
        >
          {LOCATION_IDS.map((id) => (
            <div key={id} role="listitem" className="h-full">
              <PremiumLocationCard
                config={getLocationConfig(id)}
                image={LOCATION_IMAGES[id]}
                onSelect={handleSelect}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
