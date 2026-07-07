import { memo } from "react";
import type { PresentationCard } from "../presentation/types";
import { CardShell } from "./CardShell";

type ContactCardProps = {
  card: Extract<PresentationCard, { kind: "contact" }>;
  index?: number;
};

export const ContactCard = memo(function ContactCard({ card, index = 0 }: ContactCardProps) {
  const mapsHref =
    card.mapsUrl ||
    (card.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(card.address)}`
      : "");

  return (
    <CardShell emoji="☎" title="Contact Us" delayMs={index * 80} className="cheffy-card--contact">
      {card.phone && (
        <p className="cheffy-card__meta">
          <span aria-hidden="true">☎</span> {card.phone}
        </p>
      )}
      {card.email && (
        <p className="cheffy-card__meta">
          <span aria-hidden="true">📧</span> {card.email}
        </p>
      )}
      {card.address && (
        <p className="cheffy-card__meta">
          <span aria-hidden="true">📍</span> {card.address}
        </p>
      )}
      <div className="cheffy-card__cta-row">
        {card.phone && (
          <a className="cheffy-card__cta cheffy-card__cta--primary" href={`tel:${card.phone.replace(/[^\d+]/g, "")}`}>
            ☎ Call
          </a>
        )}
        {card.email && (
          <a className="cheffy-card__cta" href={`mailto:${card.email}`}>
            📧 Email
          </a>
        )}
        {mapsHref && (
          <a className="cheffy-card__cta" href={mapsHref} target="_blank" rel="noopener noreferrer">
            📍 Map
          </a>
        )}
      </div>
    </CardShell>
  );
});
