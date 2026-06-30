import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getLocationConfig, type LocationId } from "../../config/locations";
import LocationOptionCard, { type LocationOption } from "./LocationOptionCard";
import "./location-dropdown.css";

type Props = {
  open: boolean;
  selectedLocationId: LocationId | null;
  options: ReadonlyArray<LocationOption>;
  onSelect: (locationId: LocationId) => void;
  onClose: () => void;
};

export default function LocationSelectorModal({
  open,
  selectedLocationId,
  options,
  onSelect,
  onClose,
}: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    const selectedIdx = options.findIndex((o) => o.id === selectedLocationId);
    setHighlightIndex(selectedIdx >= 0 ? selectedIdx : 0);
    closeRef.current?.focus();
  }, [open, options, selectedLocationId]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, open]);

  const onListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightIndex((prev) => (prev >= options.length - 1 ? 0 : prev + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightIndex((prev) => (prev <= 0 ? options.length - 1 : prev - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[highlightIndex];
      if (option) onSelect(option.id);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="location-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            className="location-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="location-modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onKeyDown={onListKeyDown}
          >
            <div className="location-modal__header">
              <div>
                <p className="location-modal__eyebrow">Choose Location</p>
                <h2 id="location-modal-title" className="location-modal__title">
                  Select Desi Dhamaka Location
                </h2>
                <p className="location-modal__desc">
                  We&apos;ll remember your selection and show location-specific menu, pricing,
                  offers, contact, and booking links.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                className="location-modal__close"
                aria-label="Close location selector"
              >
                ×
              </button>
            </div>

            <div className="location-modal__list" role="listbox" aria-label="Restaurant locations">
              {options.map((option, index) => (
                <LocationOptionCard
                  key={option.id}
                  option={{
                    ...option,
                    address: option.address || getLocationConfig(option.id).address,
                  }}
                  selected={option.id === selectedLocationId}
                  highlighted={index === highlightIndex}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
