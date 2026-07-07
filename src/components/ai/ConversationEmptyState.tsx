import type { ConciergeKnowledge } from "../../services/ai/cmsKnowledge";
import { DASHBOARD_TILES, POPULAR_TOPICS, SUGGESTED_QUESTIONS } from "./cheffyActions";

type ConversationEmptyStateProps = {
  knowledge: ConciergeKnowledge | null;
  onSelectPrompt: (prompt: string) => void;
  isBusy: boolean;
};

export function ConversationEmptyState({
  knowledge,
  onSelectPrompt,
  isBusy,
}: ConversationEmptyStateProps) {
  const restaurantName =
    knowledge?.modules.restaurantSettings.data?.name?.trim() || knowledge?.locationName;
  const featuredOffer = knowledge?.modules.offers.data?.[0];

  return (
    <div className="cheffy-empty" aria-label="Start a conversation with Cheffy">
      <img
        src="/cheffy/cheffy-mascot.png"
        alt=""
        className="cheffy-empty__mascot"
        aria-hidden="true"
      />
      <h3 className="cheffy-empty__title">Namaste! 👋</h3>
      <p className="cheffy-empty__subtitle">
        {restaurantName
          ? `I'm Cheffy — your dining concierge at ${restaurantName}.`
          : "I'm Cheffy — your AI dining concierge."}
      </p>
      <p className="cheffy-empty__lead">Happy to help! What sounds good today?</p>

      {featuredOffer && (
        <button
          type="button"
          className="cheffy-empty__featured"
          onClick={() => onSelectPrompt(`Tell me about ${featuredOffer.title}`)}
          disabled={isBusy}
        >
          <span className="cheffy-empty__featured-emoji" aria-hidden="true">
            🎉
          </span>
          <span>
            <strong>{featuredOffer.title}</strong>
            <small>Today's featured offer</small>
          </span>
        </button>
      )}

      <div className="cheffy-empty__section">
        <h4>Popular right now</h4>
        <div className="cheffy-empty__chips">
          {POPULAR_TOPICS.map((item) => (
            <button
              key={item.label}
              type="button"
              className="cheffy-empty__chip"
              onClick={() => onSelectPrompt(item.prompt)}
              disabled={isBusy}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="cheffy-empty__section">
        <h4>Try asking</h4>
        <ul className="cheffy-empty__questions">
          {SUGGESTED_QUESTIONS.slice(0, 4).map((q) => (
            <li key={q.label}>
              <button
                type="button"
                onClick={() => onSelectPrompt(q.prompt)}
                disabled={isBusy}
              >
                {q.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="cheffy-empty__tiles">
        {DASHBOARD_TILES.slice(0, 6).map((tile) => (
          <button
            key={tile.label}
            type="button"
            className="cheffy-empty__tile"
            onClick={() => onSelectPrompt(tile.prompt)}
            disabled={isBusy}
          >
            <span aria-hidden="true">{tile.emoji}</span>
            <span>{tile.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
