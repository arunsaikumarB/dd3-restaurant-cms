import { MapPin } from "lucide-react";
import { LOCATION_OPTIONS, type LocationId } from "../../config/locations";
import { usePageContent } from "../../context/PageContentContext";

type Props = {
  selectedId: LocationId | null;
  onSelect: (id: LocationId) => void;
};

export default function OffersLocationPicker({ selectedId, onSelect }: Props) {
  const { fetchSection } = usePageContent();
  const copy = fetchSection("offers", "location_picker", {
    title: "Choose Your Location",
    subtitle: "Select a branch to view exclusive offers available at that restaurant.",
    viewingBadge: "Viewing Offers",
  });

  return (
    <section className="offers-location-section" aria-labelledby="offers-location-heading">
      <div className="offers-location-section__heading">
        <h2 id="offers-location-heading" className="offers-location-section__title">
          {copy.title}
        </h2>
        <p className="offers-location-section__subtitle">{copy.subtitle}</p>
      </div>
      <div className="offers-location-grid" role="listbox" aria-label="Restaurant locations">
        {LOCATION_OPTIONS.map((location) => {
          const active = location.id === selectedId;
          return (
            <button
              key={location.id}
              type="button"
              role="option"
              aria-selected={active}
              className={
                "offers-location-card" + (active ? " offers-location-card--active" : "")
              }
              onClick={() => onSelect(location.id)}
            >
              <span className="offers-location-card__icon" aria-hidden>
                <MapPin size={16} strokeWidth={1.75} />
              </span>
              <span className="offers-location-card__name">{location.name}</span>
              <span className="offers-location-card__address">{location.address}</span>
              {active && (
                <span className="offers-location-card__badge">{copy.viewingBadge}</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
