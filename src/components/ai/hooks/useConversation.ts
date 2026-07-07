import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isLocationId } from "../../../config/locations";
import { locPath } from "../../../utils/locationPaths";
import { useLocationSelection } from "../../../context/LocationContext";
import { detectIntent, intentToEmotion } from "../../../services/ai/emotionEngine";
import { useCheffyContext } from "../CheffyContext";
import { normalizeEmotion } from "../CheffyMascotState";
import type { CheffyEmotion } from "../CheffyEmotion";

type UseConversationArgs = {
  onEmotion?: (emotion: CheffyEmotion) => void;
};

/**
 * Thin UI hook over the conversation engine in CheffyContext.
 * No AI provider or backend calls — sendMessage is handled in context.
 */
export function useConversation({ onEmotion }: UseConversationArgs = {}) {
  const {
    messages,
    conversationStatus,
    isBusy,
    sendMessage,
    continueConversation,
    startNewConversation,
    clearConversation,
  } = useCheffyContext();

  const navigate = useNavigate();
  const { setLocation } = useLocationSelection();

  useEffect(() => {
    if (!onEmotion) return;
    if (conversationStatus === "typing") {
      const lastUser = [...messages].reverse().find((m) => m.role === "user");
      if (lastUser?.content) {
        onEmotion(normalizeEmotion(intentToEmotion(detectIntent(lastUser.content))));
      } else {
        onEmotion("thinking");
      }
      return;
    }
    if (conversationStatus === "streaming") onEmotion("speaking");
    else onEmotion("idle");
  }, [conversationStatus, messages, onEmotion]);

  const navigateTo = useCallback(
    (path: string) => {
      if (path.startsWith("http")) {
        window.open(path, "_blank", "noopener,noreferrer");
        return;
      }
      navigate(path.startsWith("/") ? path : `/${path}`);
    },
    [navigate],
  );

  const switchLocation = useCallback(
    (locationId: string) => {
      if (!isLocationId(locationId)) return;
      setLocation(locationId);
      navigate(locPath(locationId, "/"));
    },
    [navigate, setLocation],
  );

  return {
    messages,
    isThinking: conversationStatus === "typing",
    isStreaming: conversationStatus === "streaming",
    isBusy,
    send: sendMessage,
    continueConversation,
    startNewConversation,
    clearConversation,
    navigateTo,
    switchLocation,
  };
}
