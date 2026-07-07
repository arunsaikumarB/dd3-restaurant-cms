import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { ChatWindow } from "./ChatWindow";
import { CheffyBubble } from "./CheffyBubble";
import { useCheffyContext } from "./CheffyContext";
import { useCheffy } from "./hooks/useCheffy";
import { useConciergeLocation } from "./hooks/useLocationContext";
import { useConversation } from "./hooks/useConversation";
import { buildNudgeMessage, readGuestProfile } from "../../services/ai/personality";
import { HOVER_BUBBLE_TEXT } from "./CheffyMascotState";
import "./cheffy.css";

const GREETING_MS = 8000;
const INACTIVITY_MS = 60000;

export default function Cheffy() {
  const {
    chatOpen,
    setChatOpen,
    chatView,
    goHome,
    goToConversation,
    clearConversation,
    canNudge,
    recordNudge,
    conversationStatus,
    messages: ctxMessages,
  } = useCheffyContext();

  const [bubble, setBubble] = useState<string | null>(null);
  const [hoverBubble, setHoverBubble] = useState(false);
  const [footerLift, setFooterLift] = useState(0);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBubble = useCallback((text: string, ms: number) => {
    setBubble(text);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), ms);
  }, []);

  const {
    anchorRef,
    phase,
    setEmotion,
    entranceDone,
    isReady,
    onLocationSite,
    thinkingLabel,
    onHover,
    onHoverOut,
    onBounce,
    wave,
  } = useCheffy({
    chatOpen,
    conversationStatus,
    messages: ctxMessages,
    onShowBubble: showBubble,
  });

  const { knowledge } = useConciergeLocation(true);
  const nudgeMessage = useMemo(() => buildNudgeMessage(readGuestProfile()), [chatOpen]);
  const mascotAlt = knowledge?.locationName
    ? `Cheffy, your AI restaurant assistant for ${knowledge.locationName}`
    : "Cheffy, your AI restaurant assistant";

  const {
    messages,
    isThinking,
    isBusy,
    send,
    startNewConversation: startNew,
    navigateTo,
    switchLocation,
  } = useConversation({ onEmotion: setEmotion });

  useEffect(() => {
    if (!entranceDone || chatOpen) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!chatOpen && canNudge()) {
          recordNudge();
          setEmotion("greeting");
          wave();
          showBubble(nudgeMessage, GREETING_MS);
        }
      }, INACTIVITY_MS);
    };
    const events: (keyof WindowEventMap)[] = ["mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [entranceDone, chatOpen, canNudge, recordNudge, setEmotion, wave, showBubble, nudgeMessage]);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        const overlap = entry.isIntersecting
          ? Math.max(0, window.innerHeight - entry.boundingClientRect.top)
          : 0;
        setFooterLift(Math.min(overlap, 320));
      },
      { threshold: [0, 0.25, 0.5, 1] },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const openChat = useCallback(() => {
    if (!isReady) return;
    setBubble(null);
    setHoverBubble(false);
    onBounce();
    setEmotion("listening");
    setChatOpen(true);
  }, [isReady, onBounce, setChatOpen, setEmotion]);

  const closeChat = useCallback(() => {
    setChatOpen(false);
    setEmotion("idle");
  }, [setChatOpen, setEmotion]);

  const handleMouseEnter = useCallback(
    (e: MouseEvent<HTMLButtonElement>) => {
      if (!isReady || chatOpen) return;
      onHover(e);
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      hoverTimer.current = setTimeout(() => setHoverBubble(true), 280);
    },
    [chatOpen, isReady, onHover],
  );

  const handleFocus = useCallback(() => {
    if (!isReady || chatOpen) return;
    onHover({ clientX: 0, clientY: 0 } as MouseEvent<HTMLButtonElement>);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoverBubble(true), 280);
  }, [chatOpen, isReady, onHover]);

  const handleMouseLeave = useCallback(() => {
    onHoverOut();
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHoverBubble(false), 120);
  }, [onHoverOut]);

  const handleNewChat = useCallback(() => {
    startNew();
  }, [startNew]);

  useEffect(
    () => () => {
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    },
    [],
  );

  const anchorStyle = useMemo(
    () => ({ ["--cheffy-footer-lift" as string]: `${footerLift}px` }),
    [footerLift],
  );

  if (typeof document === "undefined" || !onLocationSite) return null;

  return createPortal(
    <div
      className={`cheffy-anchor${chatOpen ? " cheffy-anchor--open" : ""}`}
      style={anchorStyle}
      data-phase={phase}
    >
      {chatOpen && (
        <ChatWindow
          chatView={chatView}
          messages={messages}
          isThinking={isThinking}
          isBusy={isBusy}
          knowledge={knowledge}
          onSend={send}
          onClose={closeChat}
          onGoHome={goHome}
          onContinue={goToConversation}
          onNewChat={handleNewChat}
          onClear={clearConversation}
          onNavigate={navigateTo}
          onSwitchLocation={switchLocation}
        />
      )}

      {!chatOpen && hoverBubble && !bubble && (
        <CheffyBubble text={HOVER_BUBBLE_TEXT} typed={false} />
      )}

      {!chatOpen && bubble && (
        <CheffyBubble text={bubble} onClose={() => setBubble(null)} />
      )}

      {chatOpen && thinkingLabel && isBusy && (
        <p className="cheffy-mascot-status" role="status" aria-live="polite">
          {thinkingLabel}
        </p>
      )}

      <button
        type="button"
        className={[
          "cheffy-float",
          isReady ? "" : "cheffy-float--waiting",
          chatOpen ? "cheffy-float--focused" : "",
          phase === "peek" ? "cheffy-float--peek" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        ref={anchorRef}
        onClick={openChat}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleMouseLeave}
        aria-label="Open Cheffy, your AI restaurant assistant"
        aria-haspopup="dialog"
        aria-expanded={chatOpen}
        aria-disabled={!isReady}
      >
        <span className="cheffy-mascot-wrap" aria-hidden="true">
          <span className="cheffy-mascot-fx cheffy-mascot-fx--shimmer" />
          <span className="cheffy-mascot-fx cheffy-mascot-fx--scarf" />
          <span className="cheffy-mascot-fx cheffy-mascot-fx--plate" />
          <img
            src="/cheffy/cheffy-mascot.png"
            alt={mascotAlt}
            className="cheffy-mascot-img"
            draggable={false}
            width={132}
            height={198}
            loading="lazy"
            decoding="async"
          />
        </span>
      </button>
    </div>,
    document.body,
  );
}
