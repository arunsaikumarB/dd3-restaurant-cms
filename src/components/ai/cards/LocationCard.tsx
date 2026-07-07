import { memo } from "react";
import type { PresentationCard } from "../presentation/types";
import { CardShell } from "./CardShell";

type LocationCardProps = {
  card: Extract<PresentationCard, { kind: "location" }>;
  onNavigate: (path: string) => void;
  index?: number;
};

export const LocationCard = memo(function LocationCard({
  card,
  onNavigate,
  index = 0,
}: LocationCardProps) {
  const mapsHref =
    card.mapsUrl ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(card.address)}`;

  return (
    <CardShell emoji="📍" title={card.name} delayMs={index * 80} className="cheffy-card--location">
      {card.address && <p className="cheffy-card__text">{card.address}</p>}
      {card.phone && (
        <p className="cheffy-card__meta">
          <span aria-hidden="true">☎</span> {card.phone}
        </p>
      )}
      {card.hours.length > 0 && (
        <ul className="cheffy-card__hours">
          {card.hours.slice(0, 4).map((row) => (
            <li key={`${row.days}-${row.time}`}>
              <strong>{row.days}</strong> {row.time}
            </li>
          ))}
        </ul>
      )}
      <div className="cheffy-card__cta-row">
        {card.phone && (
          <a className="cheffy-card__cta" href={`tel:${card.phone.replace(/[^\d+]/g, "")}`}>
            ☎ Call
          </a>
        )}
        <a
          className="cheffy-card__cta"
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          📍 Directions
        </a>
        {card.orderUrl && (
          <button
            type="button"
            className="cheffy-card__cta cheffy-card__cta--primary"
            onClick={() => onNavigate(card.orderUrl!)}
          >
            🛵 Order Online
          </button>
        )}
        {card.websitePath && (
          <button type="button" className="cheffy-card__cta" onClick={() => onNavigate(card.websitePath!)}>
            Website
          </button>
        )}
      </div>
    </CardShell>
  );
});
