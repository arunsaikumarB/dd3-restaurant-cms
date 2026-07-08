import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useLocation } from "react-router-dom";
import { LOCATION_IDS, type LocationId } from "../../../config/locations";
import { useLocationSelection } from "../../../context/LocationContext";
import { detectIntent } from "../../../services/ai/emotionEngine";
import type { ConversationStatus } from "../../../services/conversation";
import {
  readSessionFlag,
  writeSessionFlag,
} from "../../../services/conversation/sessionMemory";
import type { MascotPhase } from "../CheffyMascotState";
import {
  INTRO_BUBBLE_TEXT,
  INTRO_DELAY_MS,
  locationWelcomeMessage,
  MASCOT_HIDDEN_TRANSFORM,
  normalizeEmotion,
  pickThinkingMessage,
  SESSION_INTRO_KEY,
} from "../CheffyMascotState";
import type { CheffyEmotion } from "../CheffyEmotion";
import { useCheffyContext } from "../CheffyContext";

type AnimatorModule = typeof import("../CheffyAnimator");

type UseCheffyOptions = {
  chatOpen: boolean;
  conversationStatus: ConversationStatus;
  messages: Array<{ role: string; content: string }>;
  onShowBubble: (text: string, ms: number) => void;
};

function isLocationSitePath(pathname: string): boolean {
  return LOCATION_IDS.some(
    (id) => pathname === `/${id}` || pathname.startsWith(`/${id}/`),
  );
}

export function useCheffy({
  chatOpen,
  conversationStatus,
  messages,
  onShowBubble,
}: UseCheffyOptions) {
  const { selectedLocationId } = useLocationSelection();
  const { markEntered } = useCheffyContext();
  const { pathname } = useLocation();

  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const animatorRef = useRef<InstanceType<AnimatorModule["CheffyAnimator"]> | null>(null);
  const animatorPromiseRef = useRef<Promise<AnimatorModule> | null>(null);
  const startedRef = useRef(false);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLocationRef = useRef<LocationId | null>(null);

  const sessionIntroDone = readSessionFlag(SESSION_INTRO_KEY);
  const [phase, setPhase] = useState<MascotPhase>(sessionIntroDone ? "idle" : "hidden");
  const [isReady, setIsReady] = useState(sessionIntroDone);
  const [entranceDone, setEntranceDone] = useState(sessionIntroDone);
  const [thinkingLabel, setThinkingLabel] = useState<string | null>(null);

  const onLocationSite =
    Boolean(selectedLocationId) && isLocationSitePath(pathname);

  const loadAnimator = useCallback(async () => {
    if (!animatorPromiseRef.current) {
      animatorPromiseRef.current = import("../CheffyAnimator");
    }
    return animatorPromiseRef.current;
  }, []);

  const finishIntro = useCallback(() => {
    markEntered();
    writeSessionFlag(SESSION_INTRO_KEY, true);
    setEntranceDone(true);
    setIsReady(true);
    setPhase("idle");
  }, [markEntered]);

  const startAnimator = useCallback(async () => {
    if (!anchorRef.current || startedRef.current || !onLocationSite) return;
    startedRef.current = true;

    const { CheffyAnimator } = await loadAnimator();
    const introDone = readSessionFlag(SESSION_INTRO_KEY);
    const animator = new CheffyAnimator(anchorRef.current, { startHidden: !introDone });
    animatorRef.current = animator;

    if (introDone) {
      animator.placeHome();
      setPhase("idle");
      setEntranceDone(true);
      setIsReady(true);
      return;
    }

    setPhase("hidden");
    introTimerRef.current = setTimeout(() => {
      setIsReady(true);
      onShowBubble(INTRO_BUBBLE_TEXT, 3500);
      animator.playSessionIntro(
        (p) => setPhase(p),
        finishIntro,
      );
    }, INTRO_DELAY_MS);
  }, [finishIntro, loadAnimator, onLocationSite, onShowBubble]);

  const applyHiddenTransform = useCallback((node: HTMLButtonElement) => {
    node.style.transform = MASCOT_HIDDEN_TRANSFORM;
  }, []);

  const setAnchorRef = useCallback(
    (node: HTMLButtonElement | null) => {
      anchorRef.current = node;
      if (!node) {
        if (introTimerRef.current) clearTimeout(introTimerRef.current);
        animatorRef.current?.destroy();
        animatorRef.current = null;
        startedRef.current = false;
        return;
      }
      if (!readSessionFlag(SESSION_INTRO_KEY)) {
        applyHiddenTransform(node);
      }
      if (onLocationSite) void startAnimator();
    },
    [applyHiddenTransform, onLocationSite, startAnimator],
  );

  useLayoutEffect(() => {
    const node = anchorRef.current;
    if (!node || !onLocationSite || readSessionFlag(SESSION_INTRO_KEY)) return;
    if (phase === "hidden" && !animatorRef.current) {
      applyHiddenTransform(node);
    }
  }, [applyHiddenTransform, onLocationSite, phase]);

  useEffect(() => {
    if (!onLocationSite) {
      setPhase("hidden");
      setIsReady(false);
      if (introTimerRef.current) clearTimeout(introTimerRef.current);
      animatorRef.current?.destroy();
      animatorRef.current = null;
      startedRef.current = false;
    }
  }, [onLocationSite]);

  useEffect(() => {
    const locationId = selectedLocationId;
    if (!locationId || !onLocationSite || !entranceDone) {
      prevLocationRef.current = locationId;
      return;
    }

    const prev = prevLocationRef.current;
    prevLocationRef.current = locationId;

    if (!prev || prev === locationId) return;

    void (async () => {
      const animator = animatorRef.current;
      if (!animator) return;
      animator.playOutletSwitch(() => {
        onShowBubble(locationWelcomeMessage(locationId), 2800);
      });
    })();
  }, [selectedLocationId, onLocationSite, entranceDone, onShowBubble]);

  useEffect(() => {
    const animator = animatorRef.current;
    if (!animator || !entranceDone) return;

    if (chatOpen) {
      if (conversationStatus === "typing") {
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        if (lastUser?.content) {
          setThinkingLabel(pickThinkingMessage(detectIntent(lastUser.content)));
        } else {
          setThinkingLabel("Let me look into that…");
        }
        animator.setPhaseMotion("thinking");
        setPhase("thinking");
      } else if (conversationStatus === "streaming") {
        setThinkingLabel(null);
        animator.setPhaseMotion("speaking");
        setPhase("speaking");
      } else {
        setThinkingLabel(null);
        animator.setPhaseMotion("listening");
        setPhase("listening");
      }
      return;
    }

    setThinkingLabel(null);
    if (conversationStatus === "idle") {
      animator.exitChatFocus();
      setPhase("idle");
    }
  }, [chatOpen, conversationStatus, messages, entranceDone]);

  useEffect(() => {
    const onCelebrate = () => {
      animatorRef.current?.celebrate();
      setPhase("celebrating");
    };
    window.addEventListener("cheffy:mascot-celebrate", onCelebrate);
    return () => window.removeEventListener("cheffy:mascot-celebrate", onCelebrate);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) animatorRef.current?.pause();
      else animatorRef.current?.resume();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(
    () => () => {
      if (introTimerRef.current) clearTimeout(introTimerRef.current);
      animatorRef.current?.destroy();
      animatorRef.current = null;
      startedRef.current = false;
    },
    [],
  );

  const onHover = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    animatorRef.current?.hover(e.clientX, e.clientY);
  }, []);

  const onHoverOut = useCallback(() => {
    animatorRef.current?.hoverOut();
  }, []);

  const onBounce = useCallback(() => animatorRef.current?.bounce(), []);
  const wave = useCallback(() => animatorRef.current?.playWave(), []);

  const setEmotion = useCallback((emotion: CheffyEmotion) => {
    const next = normalizeEmotion(emotion);
    setPhase(next);
    animatorRef.current?.setPhaseMotion(next);
  }, []);

  return {
    anchorRef: setAnchorRef,
    phase,
    emotion: phase,
    setEmotion,
    entranceDone,
    isReady,
    onLocationSite,
    thinkingLabel,
    onHover,
    onHoverOut,
    onBounce,
    wave,
  };
}
