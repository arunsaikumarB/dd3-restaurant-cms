import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MapPin } from "lucide-react";
import { getLocationConfig, type LocationId } from "../../config/locations";
import LocationOptionCard, { type LocationOption } from "./LocationOptionCard";
import "./location-dropdown.css";

type Props = {
  options: ReadonlyArray<LocationOption>;
  selectedLocationId: LocationId | null;
  onSelect: (locationId: LocationId) => void;
  variant?: "navbar" | "header" | "full";
  tone?: "light" | "dark";
  className?: string;
};

export default function LocationDropdown({
  options,
  selectedLocationId,
  onSelect,
  variant = "full",
  tone = "light",
  className = "",
}: Props) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);

  const selected = selectedLocationId ? getLocationConfig(selectedLocationId) : null;
  const displayName = selected?.name ?? "Select Location";
  const isHeader = variant === "header" || variant === "navbar";
  const showSubtitle = !isHeader;

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const openDropdown = useCallback(() => {
    const selectedIdx = options.findIndex((o) => o.id === selectedLocationId);
    setHighlightIndex(selectedIdx >= 0 ? selectedIdx : 0);
    setOpen(true);
  }, [options, selectedLocationId]);

  const handleSelect = useCallback(
    (locationId: LocationId) => {
      onSelect(locationId);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onSelect],
  );

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        close();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [close, open]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        close();
      }
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openDropdown();
        return;
      }
      setHighlightIndex((prev) => {
        if (event.key === "ArrowDown") {
          return prev >= options.length - 1 ? 0 : prev + 1;
        }
        return prev <= 0 ? options.length - 1 : prev - 1;
      });
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) {
        openDropdown();
        return;
      }
      const option = options[highlightIndex];
      if (option) handleSelect(option.id);
      return;
    }

    if (event.key === "Home" && open) {
      event.preventDefault();
      setHighlightIndex(0);
      return;
    }

    if (event.key === "End" && open) {
      event.preventDefault();
      setHighlightIndex(options.length - 1);
    }
  };

  return (
    <div
      ref={rootRef}
      className={
        "location-dropdown " +
        (variant === "header" || variant === "navbar"
          ? "location-dropdown--header "
          : "location-dropdown--full ") +
        (isHeader && tone === "light" ? "location-dropdown--light " : "") +
        className
      }
    >
      <button
        ref={triggerRef}
        type="button"
        className={"location-dropdown__trigger" + (open ? " location-dropdown__trigger--open" : "")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        onClick={() => (open ? close() : openDropdown())}
        onKeyDown={onKeyDown}
      >
        <span className="location-dropdown__trigger-left">
          <span className="location-dropdown__icon-wrap" aria-hidden>
            <MapPin size={18} strokeWidth={1.75} />
          </span>
          <span className="location-dropdown__text">
            <span className="location-dropdown__name">{displayName}</span>
            {showSubtitle && (
              <span className="location-dropdown__subtitle">
                Serving Authentic Indian Cuisine
              </span>
            )}
          </span>
        </span>
        <ChevronDown
          size={20}
          strokeWidth={1.75}
          className={"location-dropdown__chevron" + (open ? " location-dropdown__chevron--open" : "")}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={listboxId}
            role="listbox"
            aria-label="Restaurant locations"
            className={
              "location-dropdown__panel" +
              (isHeader ? " location-dropdown__panel--header" : "")
            }
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <ul className="location-dropdown__list">
              {options.map((option, index) => (
                <li key={option.id}>
                  <LocationOptionCard
                    id={`${listboxId}-option-${option.id}`}
                    option={option}
                    selected={option.id === selectedLocationId}
                    highlighted={index === highlightIndex}
                    onSelect={handleSelect}
                  />
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
