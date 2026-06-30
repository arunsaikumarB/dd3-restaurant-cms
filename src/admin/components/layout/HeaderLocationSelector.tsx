import { useEffect, useRef, useState } from "react";
import { ChevronDown, Globe, MapPin } from "lucide-react";
import { useAdminTheme } from "../../context/AdminThemeContext";
import { useLocation } from "../../hooks/useLocation";
import type { AdminLocationScope } from "../../types/location";
import type { LocationId } from "../../../config/locations";

const ALL_LOCATIONS_OPTION = {
  id: "all" as const,
  name: "All Locations",
};

export default function HeaderLocationSelector() {
  const { dark } = useAdminTheme();
  const { scope, setLocation, options } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedLabel =
    scope === "all"
      ? ALL_LOCATIONS_OPTION.name
      : options.find((option) => option.id === scope)?.name ?? "Location";

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (id: AdminLocationScope) => {
    setLocation(id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={[
          "flex h-10 min-w-[200px] items-center justify-between gap-2 rounded-xl border px-3 text-sm font-medium",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-admin-orange/30",
          dark
            ? "border-admin-border-dark bg-white/5 text-white hover:bg-white/10"
            : "border-admin-border bg-admin-ivory/50 text-admin-text hover:bg-admin-ivory",
        ].join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Restaurant location"
      >
        <span className="flex min-w-0 items-center gap-2">
          <MapPin size={15} className="shrink-0 text-admin-orange" aria-hidden />
          <span className="truncate">{selectedLabel}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select restaurant location"
          className={[
            "absolute left-0 top-[calc(100%+6px)] z-50 min-w-full overflow-hidden rounded-xl border py-1 shadow-lg",
            dark ? "border-admin-border-dark bg-admin-surface-dark" : "border-admin-border bg-white",
          ].join(" ")}
        >
          <button
            type="button"
            role="option"
            aria-selected={scope === "all"}
            onClick={() => handleSelect("all")}
            className={[
              "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm",
              scope === "all"
                ? dark
                  ? "bg-admin-orange/15 text-white"
                  : "bg-admin-orange/10 text-admin-text"
                : dark
                  ? "text-white/80 hover:bg-white/5"
                  : "text-admin-text hover:bg-admin-ivory",
            ].join(" ")}
          >
            <Globe size={15} className="shrink-0 text-admin-orange" aria-hidden />
            <span>{ALL_LOCATIONS_OPTION.name}</span>
          </button>
          {options.map((option) => {
            const active = scope === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => handleSelect(option.id as LocationId)}
                className={[
                  "flex w-full flex-col px-3 py-2.5 text-left",
                  active
                    ? dark
                      ? "bg-admin-orange/15 text-white"
                      : "bg-admin-orange/10 text-admin-text"
                    : dark
                      ? "text-white/80 hover:bg-white/5"
                      : "text-admin-text hover:bg-admin-ivory",
                ].join(" ")}
              >
                <span className="text-sm font-medium">{option.name}</span>
                <span className={`text-xs ${dark ? "text-white/45" : "text-admin-muted"}`}>
                  {option.address}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
