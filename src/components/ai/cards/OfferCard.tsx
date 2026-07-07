import { memo } from "react";
import type { PresentationCard } from "../presentation/types";
import { CardShell } from "./CardShell";

type OfferCardProps = {
  card: Extract<PresentationCard, { kind: "offer" }>;
  onNavigate: (path: string) => void;
  index?: number;
};

export const OfferCard = memo(function OfferCard({
  card,
  onNavigate,
  index = 0,
}: OfferCardProps) {
  return (
    <div className="cheffy-card-stack">
      {card.offers.map((offer, i) => (
        <CardShell
          key={offer.slug || offer.title}
          emoji="🎉"
          title={offer.title}
          delayMs={index * 80 + i * 60}
          className="cheffy-card--offer"
        >
          {offer.badge && <span className="cheffy-card__badge">{offer.badge}</span>}
          {offer.description && <p className="cheffy-card__text">{offer.description}</p>}
          <div className="cheffy-card__cta-row">
            <button
              type="button"
              className="cheffy-card__cta cheffy-card__cta--primary"
              onClick={() => onNavigate(card.orderPath)}
            >
              🛵 Order Now
            </button>
            <button
              type="button"
              className="cheffy-card__cta"
              onClick={() => onNavigate(card.offerPath)}
            >
              View Offer
            </button>
          </div>
        </CardShell>
      ))}
    </div>
  );
});
