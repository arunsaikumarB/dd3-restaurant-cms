import { memo } from "react";
import type { PresentationCard } from "../presentation/types";
import { ContactCard } from "./ContactCard";
import { LocationCard } from "./LocationCard";
import { OfferCard } from "./OfferCard";
import { RecommendationCard } from "./RecommendationCard";

type PresentationCardsProps = {
  cards: PresentationCard[];
  onNavigate: (path: string) => void;
};

export const PresentationCards = memo(function PresentationCards({
  cards,
  onNavigate,
}: PresentationCardsProps) {
  if (!cards.length) return null;

  return (
    <div className="cheffy-cards" role="list">
      {cards.map((card, index) => {
        switch (card.kind) {
          case "offer":
            return <OfferCard key="offer" card={card} onNavigate={onNavigate} index={index} />;
          case "location":
            return <LocationCard key="location" card={card} onNavigate={onNavigate} index={index} />;
          case "contact":
            return <ContactCard key="contact" card={card} index={index} />;
          case "recommendation":
            return (
              <RecommendationCard key="recommend" card={card} onNavigate={onNavigate} index={index} />
            );
          default:
            return null;
        }
      })}
    </div>
  );
});
