import { memo } from "react";
import type { PresentationCard } from "../presentation/types";
import { CardShell } from "./CardShell";

type RecommendationCardProps = {
  card: Extract<PresentationCard, { kind: "recommendation" }>;
  onNavigate: (path: string) => void;
  index?: number;
};

export const RecommendationCard = memo(function RecommendationCard({
  card,
  onNavigate,
  index = 0,
}: RecommendationCardProps) {
  return (
    <CardShell
      emoji="🍛"
      title="You might love"
      delayMs={index * 80}
      className="cheffy-card--recommend"
    >
      <ul className="cheffy-card__recommend-list">
        {card.items.map((item, i) => (
          <li
            key={item.id}
            className="cheffy-card__recommend-item"
            style={{ animationDelay: `${index * 80 + i * 50}ms` }}
          >
            <span className="cheffy-card__recommend-emoji" aria-hidden="true">
              {item.emoji}
            </span>
            <div>
              <strong>{item.title}</strong>
              <small>{item.tag}</small>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="cheffy-card__cta cheffy-card__cta--primary cheffy-card__cta--full"
        onClick={() => onNavigate(card.menuPath)}
      >
        🍽️ View Menu
      </button>
    </CardShell>
  );
});
