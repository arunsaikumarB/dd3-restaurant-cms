import { useEffect, useMemo, useState } from "react";
import { detectConversationTopic } from "./presentation/detectTopic";
import { readGuestProfile } from "../../services/ai/personality";

const STATUS_MESSAGES: Record<string, string[]> = {
  offers: ["🎉 I'm checking today's offers for you…", "✨ Finding the best deals…"],
  location: ["📍 Looking up your location…", "🗺️ Getting directions ready…"],
  hours: ["🕒 Checking our hours…", "⏰ Finding the best time to visit…"],
  contact: ["☎ Pulling up contact details…", "📧 Getting you connected…"],
  menu: ["🍛 Preparing menu highlights…", "🍽️ Curating delicious options…"],
  recommend: ["🍛 I'd love to recommend something…", "⭐ Finding guest favorites…"],
  gallery: ["📷 Finding gallery photos…", "🖼️ Loading beautiful moments…"],
  reviews: ["⭐ Reading guest reviews…", "❤️ Gathering the love…"],
  catering: ["🎉 Checking catering options…", "🥘 Planning something special…"],
  reservation: ["📅 Getting reservation details…", "🍽️ Happy to help you book…"],
  order: ["🛵 Preparing your order options…", "🥡 Almost ready to order…"],
  general: [
    "🍛 I'm checking that for you…",
    "✨ I'd be delighted to help!",
    "🍽️ Just a moment…",
  ],
};

type DynamicTypingIndicatorProps = {
  userMessage?: string;
};

export function DynamicTypingIndicator({ userMessage = "" }: DynamicTypingIndicatorProps) {
  const profile = readGuestProfile();
  const topic = useMemo(
    () => profile.lastTopic || detectConversationTopic(userMessage),
    [profile.lastTopic, userMessage],
  );
  const messages = useMemo(() => {
    const base = [...(STATUS_MESSAGES[topic] ?? STATUS_MESSAGES.general)];
    if (profile.guestMood === "hungry") {
      base.unshift("🍛 Finding something delicious for you…");
    }
    if (profile.guestMood === "celebrating") {
      base.unshift("🎉 Planning something special…");
    }
    return base;
  }, [topic, profile.guestMood]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 2400);
    return () => window.clearInterval(timer);
  }, [messages, topic]);

  const label = messages[index];

  return (
    <div className="cheffy-typing" aria-live="polite" aria-label={label}>
      <span className="cheffy-typing__label">{label}</span>
      <span className="cheffy-typing__dots" aria-hidden="true">
        <span className="cheffy-typing__dot" />
        <span className="cheffy-typing__dot" />
        <span className="cheffy-typing__dot" />
      </span>
    </div>
  );
}
