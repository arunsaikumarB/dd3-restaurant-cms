import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { DEFAULT_PUBLIC_LOCATION_ID, type LocationId } from "../../config/locations";
import { useLocationSelection } from "../../context/LocationContext";
import {
  isAbortError,
  streamResponse,
  CHEFFY_KITCHEN_ERROR,
} from "../../services/ai";
import { enrichAIRequestWithOrchestrator } from "../../services/ai/orchestrator";
import {
  getOrCreateConversationId,
  readSessionPreferences,
  writeSessionPreferences,
} from "../../services/ai/sessionMemory";
import {
  recordGuestInteraction,
  updateGuestProfileFromMessage,
} from "../../services/ai/personality";
import { parseActions } from "../../services/ai/aiService";
import { parseMessageActions } from "../../services/ai/actions";
import {
  buildCMSKnowledge,
  resolveCMSReply,
  resolveCMSReplyWhenLoading,
  resolveCMSReplyWhenUnavailable,
  type CMSKnowledge,
} from "../../services/cms/knowledge";
import {
  ENTERED_KEY,
  LAST_NUDGE_KEY,
  appendMessage,
  clearMessages,
  createMessage,
  delay,
  readConversationHistory,
  readSessionFlag,
  readSessionNumber,
  streamText,
  updateMessage,
  writeConversationHistory,
  writeSessionFlag,
  writeSessionNumber,
  type ChatMessage,
  type ConversationStatus,
} from "../../services/conversation";

export type CheffyChatView = "home" | "conversation";

type CheffyContextValue = {
  hasEntered: boolean;
  markEntered: () => void;
  chatOpen: boolean;
  setChatOpen: (open: boolean) => void;
  chatView: CheffyChatView;
  goHome: () => void;
  goToConversation: () => void;
  continueConversation: () => void;
  messages: ChatMessage[];
  conversationStatus: ConversationStatus;
  isBusy: boolean;
  knowledge: CMSKnowledge | null;
  knowledgeLoading: boolean;
  refreshKnowledge: (locationId: LocationId) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  startNewConversation: () => void;
  clearConversation: () => void;
  canNudge: () => boolean;
  recordNudge: () => void;
};

const CheffyContext = createContext<CheffyContextValue | null>(null);

const TYPING_DELAY_MS = 550;

function toAIHistory(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
}

async function streamCMSFallback(
  rawReply: string,
  assistantId: string,
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  signal: AbortSignal,
) {
  const { text, uiActions } = parseActions(rawReply);
  await streamText(
    text,
    (slice, status) => {
      const safeSlice = parseMessageActions(slice, { allowPartial: status !== "complete" }).displayText;
      setMessages((prev) =>
        updateMessage(prev, assistantId, {
          content: safeSlice,
          status,
          actions: status === "complete" ? uiActions : undefined,
        }),
      );
    },
    { signal },
  );
}

export function AIProvider({ children }: { children: ReactNode }) {
  const { selectedLocationId } = useLocationSelection();
  const locationId = (selectedLocationId ?? DEFAULT_PUBLIC_LOCATION_ID) as LocationId;

  const [hasEntered, setHasEntered] = useState(() => readSessionFlag(ENTERED_KEY));
  const [chatOpen, setChatOpenState] = useState(false);
  const [chatView, setChatView] = useState<CheffyChatView>("home");
  const [messages, setMessages] = useState<ChatMessage[]>(readConversationHistory);
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>("idle");
  const [knowledge, setKnowledge] = useState<CMSKnowledge | null>(null);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const knowledgeRef = useRef<CMSKnowledge | null>(null);
  const conversationIdRef = useRef(getOrCreateConversationId());
  const sessionPrefsRef = useRef(readSessionPreferences());
  const nudgeRef = useRef(readSessionNumber(LAST_NUDGE_KEY));
  const streamAbortRef = useRef<AbortController | null>(null);

  const refreshKnowledge = useCallback(async (targetLocationId: LocationId) => {
    setKnowledgeLoading(true);
    try {
      const data = await buildCMSKnowledge(targetLocationId);
      knowledgeRef.current = data;
      setKnowledge(data);
    } catch {
      knowledgeRef.current = null;
      setKnowledge(null);
    } finally {
      setKnowledgeLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshKnowledge(locationId);
  }, [locationId, refreshKnowledge]);

  useEffect(() => {
    writeConversationHistory(messages);
  }, [messages]);

  useEffect(
    () => () => {
      streamAbortRef.current?.abort();
    },
    [],
  );

  const setChatOpen = useCallback((open: boolean) => {
    setChatOpenState(open);
    if (open) setChatView("home");
  }, []);

  const goHome = useCallback(() => setChatView("home"), []);
  const goToConversation = useCallback(() => setChatView("conversation"), []);
  const continueConversation = useCallback(() => setChatView("conversation"), []);

  const cancelActiveStream = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setConversationStatus("idle");
  }, []);

  const clearConversation = useCallback(() => {
    cancelActiveStream();
    setMessages(clearMessages());
    setChatView("home");
  }, [cancelActiveStream]);

  const startNewConversation = useCallback(() => {
    cancelActiveStream();
    setMessages(clearMessages());
    setChatView("conversation");
  }, [cancelActiveStream]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || conversationStatus !== "idle") return;

      setChatView("conversation");
      const userMsg = createMessage("user", trimmed);
      const historyForAI = toAIHistory([...messages, userMsg]);
      setMessages((prev) => appendMessage(prev, userMsg));
      setConversationStatus("typing");

      const controller = new AbortController();
      streamAbortRef.current = controller;

      const assistant = createMessage("assistant", "", { status: "pending" });

      try {
        await delay(TYPING_DELAY_MS, controller.signal);

        const cmsKnowledge = knowledgeRef.current;
        if (!cmsKnowledge || cmsKnowledge.locationId !== locationId) {
          const loadingReply = knowledgeLoading || cmsKnowledge?.locationId !== locationId
            ? resolveCMSReplyWhenLoading()
            : resolveCMSReplyWhenUnavailable();
          setMessages((prev) => appendMessage(prev, assistant));
          setConversationStatus("streaming");
          await streamCMSFallback(loadingReply, assistant.id, setMessages, controller.signal);
          return;
        }

        setMessages((prev) => appendMessage(prev, assistant));
        setConversationStatus("streaming");

        recordGuestInteraction();
        sessionPrefsRef.current = updateGuestProfileFromMessage(trimmed, sessionPrefsRef.current);
        writeSessionPreferences(sessionPrefsRef.current);

        const aiRequest = await enrichAIRequestWithOrchestrator(
          {
            message: trimmed,
            history: historyForAI,
            conversationId: conversationIdRef.current,
            signal: controller.signal,
          },
          cmsKnowledge,
          sessionPrefsRef.current,
        );

        let replyText = "";

        try {
          const result = await streamResponse(aiRequest, {
              signal: controller.signal,
              onChunk: (chunk) => {
                replyText = chunk.content;
                const { displayText, actions } = parseMessageActions(chunk.content, {
                  allowPartial: !chunk.done,
                });
                setMessages((prev) =>
                  updateMessage(prev, assistant.id, {
                    content: displayText,
                    status: chunk.done ? "complete" : "streaming",
                    actions: chunk.done ? actions : undefined,
                  }),
                );
              },
            },
          );
          replyText = result.content;
          const { text, uiActions } = parseActions(replyText);
          setMessages((prev) =>
            updateMessage(prev, assistant.id, {
              content: text,
              actions: uiActions,
              status: "complete",
            }),
          );
        } catch (aiErr) {
          if (isAbortError(aiErr)) return;
          try {
            const fallbackRaw = resolveCMSReply(trimmed, cmsKnowledge);
            await streamCMSFallback(fallbackRaw, assistant.id, setMessages, controller.signal);
          } catch {
            await streamCMSFallback(CHEFFY_KITCHEN_ERROR, assistant.id, setMessages, controller.signal);
          }
        }
      } catch (err) {
        if (isAbortError(err)) return;
      } finally {
        streamAbortRef.current = null;
        setConversationStatus("idle");
      }
    },
    [conversationStatus, knowledgeLoading, locationId, messages],
  );

  const markEntered = useCallback(() => {
    setHasEntered(true);
    writeSessionFlag(ENTERED_KEY, true);
  }, []);

  const canNudge = useCallback(() => {
    const TEN_MIN = 10 * 60 * 1000;
    return Date.now() - nudgeRef.current > TEN_MIN;
  }, []);

  const recordNudge = useCallback(() => {
    nudgeRef.current = Date.now();
    writeSessionNumber(LAST_NUDGE_KEY, nudgeRef.current);
  }, []);

  const isBusy = conversationStatus !== "idle";

  const value = useMemo<CheffyContextValue>(
    () => ({
      hasEntered,
      markEntered,
      chatOpen,
      setChatOpen,
      chatView,
      goHome,
      goToConversation,
      continueConversation,
      messages,
      conversationStatus,
      isBusy,
      knowledge,
      knowledgeLoading,
      refreshKnowledge,
      sendMessage,
      startNewConversation,
      clearConversation,
      canNudge,
      recordNudge,
    }),
    [
      hasEntered,
      markEntered,
      chatOpen,
      setChatOpen,
      chatView,
      goHome,
      goToConversation,
      continueConversation,
      messages,
      conversationStatus,
      isBusy,
      knowledge,
      knowledgeLoading,
      refreshKnowledge,
      sendMessage,
      startNewConversation,
      clearConversation,
      canNudge,
      recordNudge,
    ],
  );

  return <CheffyContext.Provider value={value}>{children}</CheffyContext.Provider>;
}

export function useCheffyContext(): CheffyContextValue {
  const ctx = useContext(CheffyContext);
  if (!ctx) throw new Error("useCheffyContext must be used within AIProvider");
  return ctx;
}
