import type { ConciergeKnowledge } from "../../services/ai/cmsKnowledge";
import { hasUserMessages, lastUserPreview } from "../../services/conversation";
import type { ChatMessage } from "../../services/conversation";
import {
  DASHBOARD_TILES,
  HOME_QUICK_ACTIONS,
  POPULAR_TOPICS,
  SUGGESTED_QUESTIONS,
} from "./cheffyActions";

type ChatHomeProps = {
  messages: ChatMessage[];
  knowledge: ConciergeKnowledge | null;
  isBusy: boolean;
  onSelectPrompt: (prompt: string) => void;
  onContinue: () => void;
  onNewChat: () => void;
  onClear: () => void;
};

export function ChatHome({
  messages,
  knowledge,
  isBusy,
  onSelectPrompt,
  onContinue,
  onNewChat,
  onClear,
}: ChatHomeProps) {
  const hasHistory = hasUserMessages(messages);
  const preview = lastUserPreview(messages);
  const restaurantName =
    knowledge?.modules.restaurantSettings.data?.name?.trim() || knowledge?.locationName;
  const featuredOffer = knowledge?.modules.offers.data?.[0];

  return (
    <div className="cheffy-home cheffy-home--dashboard">
      <div className="cheffy-home__hero">
        <img
          src="/cheffy/cheffy-mascot.png"
          alt=""
          className="cheffy-home__avatar"
          aria-hidden="true"
        />
        <p className="cheffy-home__eyebrow">Namaste! 👋</p>
        <h2 className="cheffy-home__title">Happy to help!</h2>
        <p className="cheffy-home__subtitle">
          I'm <strong>Cheffy</strong>, your dining concierge
          {restaurantName ? ` at ${restaurantName}` : ""}.
        </p>
        {knowledge && (
          <p className="cheffy-home__location">
            <span aria-hidden="true">📍</span> {knowledge.locationName}
          </p>
        )}
      </div>

      {featuredOffer && (
        <section className="cheffy-home__featured" aria-label="Today's offer preview">
          <button
            type="button"
            className="cheffy-home__featured-card"
            onClick={() => onSelectPrompt(`Tell me about ${featuredOffer.title}`)}
            disabled={isBusy}
          >
            <span className="cheffy-home__featured-emoji" aria-hidden="true">
              🎉
            </span>
            <div>
              <span className="cheffy-home__featured-label">Today's Offer</span>
              <strong>{featuredOffer.title}</strong>
              {featuredOffer.description && <p>{featuredOffer.description}</p>}
            </div>
          </button>
        </section>
      )}

      <section className="cheffy-home__section" aria-label="Dashboard shortcuts">
        <h3 className="cheffy-home__section-title">Explore</h3>
        <div className="cheffy-home__dashboard-grid">
          {DASHBOARD_TILES.map((tile) => (
            <button
              key={tile.label}
              type="button"
              className="cheffy-home__dashboard-tile"
              onClick={() => onSelectPrompt(tile.prompt)}
              disabled={isBusy}
            >
              <span className="cheffy-home__dashboard-emoji" aria-hidden="true">
                {tile.emoji}
              </span>
              <span>{tile.label}</span>
            </button>
          ))}
        </div>
      </section>

      {hasHistory && (
        <section className="cheffy-home__section" aria-label="Recent conversation">
          <h3 className="cheffy-home__section-title">Recent Conversation</h3>
          {preview && <p className="cheffy-home__preview">"{preview}"</p>}
          <div className="cheffy-home__history-actions">
            <button
              type="button"
              className="cheffy-home__primary-btn"
              onClick={onContinue}
              disabled={isBusy}
            >
              Continue Conversation
            </button>
            <button
              type="button"
              className="cheffy-home__secondary-btn"
              onClick={onNewChat}
              disabled={isBusy}
            >
              Start Fresh
            </button>
            <button type="button" className="cheffy-home__text-btn" onClick={onClear}>
              Clear History
            </button>
          </div>
        </section>
      )}

      <section className="cheffy-home__section" aria-label="Quick actions">
        <h3 className="cheffy-home__section-title">Quick Actions</h3>
        <div className="cheffy-home__chips">
          {HOME_QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              type="button"
              className="cheffy-home__chip"
              onClick={() => onSelectPrompt(action.prompt)}
              disabled={isBusy}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>

      <section className="cheffy-home__section" aria-label="Popular topics">
        <h3 className="cheffy-home__section-title">Popular Topics</h3>
        <div className="cheffy-home__chips">
          {POPULAR_TOPICS.map((topic) => (
            <button
              key={topic.label}
              type="button"
              className="cheffy-home__chip cheffy-home__chip--soft"
              onClick={() => onSelectPrompt(topic.prompt)}
              disabled={isBusy}
            >
              {topic.label}
            </button>
          ))}
        </div>
      </section>

      <section className="cheffy-home__section" aria-label="Suggested questions">
        <h3 className="cheffy-home__section-title">Suggested Questions</h3>
        <ul className="cheffy-home__suggestions">
          {SUGGESTED_QUESTIONS.map((q) => (
            <li key={q.label}>
              <button
                type="button"
                className="cheffy-home__suggestion"
                onClick={() => onSelectPrompt(q.prompt)}
                disabled={isBusy}
              >
                {q.label}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
