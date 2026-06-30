import { MapPin } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";
import type { LocationId } from "../../../config/locations";

type LocationOption = {
  id: LocationId;
  name: string;
  address: string;
};

type Props = {
  selectedId: LocationId;
  options: LocationOption[];
  onSelect: (id: LocationId) => void;
  label?: string;
};

export default function AdminLocationSelector({
  selectedId,
  options,
  onSelect,
  label = "Managing content for",
}: Props) {
  const { dark } = useAdminTheme();

  return (
    <section
      className={[
        "mb-6 rounded-2xl border p-4",
        dark ? "border-admin-border-dark bg-white/5" : "border-admin-border bg-white",
      ].join(" ")}
      aria-label="Restaurant location"
    >
      <div className="mb-3 flex items-center gap-2">
        <MapPin size={16} className={dark ? "text-admin-orange" : "text-admin-orange"} aria-hidden />
        <p className={`text-sm font-medium ${dark ? "text-white/90" : "text-admin-text"}`}>
          {label}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" role="listbox" aria-label="Select location">
        {options.map((location) => {
          const active = location.id === selectedId;
          return (
            <button
              key={location.id}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onSelect(location.id)}
              className={[
                "flex min-w-0 flex-1 flex-col rounded-xl border px-4 py-3 text-left transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-admin-orange/40",
                active
                  ? dark
                    ? "border-admin-orange bg-admin-orange/15"
                    : "border-admin-orange bg-admin-orange/10"
                  : dark
                    ? "border-admin-border-dark bg-transparent hover:bg-white/5"
                    : "border-admin-border bg-admin-cream/40 hover:bg-admin-cream",
              ].join(" ")}
            >
              <span className={`text-sm font-semibold ${dark ? "text-white" : "text-admin-text"}`}>
                {location.name}
              </span>
              <span className={`mt-0.5 text-xs ${dark ? "text-white/50" : "text-admin-muted"}`}>
                {location.address}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
