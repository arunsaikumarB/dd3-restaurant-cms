import type { LocationId } from "../../config/locations";
import type { CheffyIntent } from "../../services/ai/emotionEngine";
import { getLocationConfig } from "../../config/locations";

/** Cinematic mascot lifecycle — transform-only motion states. */
export type MascotPhase =
  | "hidden"
  | "peek"
  | "greeting"
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "celebrating";

/** @deprecated Use MascotPhase — kept for conversation emotion bridge. */
export type CheffyEmotion = MascotPhase | "happy" | "waving" | "typing" | "confused";

export const SESSION_INTRO_KEY = "cheffy_has_entered";

/** Fully off-screen to the right — used for CSS first paint and GSAP intro start. */
export const MASCOT_HIDDEN_X = "100%";
export const MASCOT_HIDDEN_TRANSFORM = "translate3d(100%, 0, 0)";

export const INTRO_DELAY_MS = 2000;
export const INTRO_BUBBLE_MS = 3500;
export const INTRO_BUBBLE_TEXT =
  "👋 Namaste! I'm Cheffy. Need help discovering Desi Dhamaka?";
export const HOVER_BUBBLE_TEXT = "Need help? 😊";

export const LOCATION_WELCOME: Partial<Record<LocationId, string>> = {
  "oak-tree": "Welcome to Oak Tree! 🌳",
  "south-plainfield": "Welcome to South Plainfield! 🌶️",
  lawrenceville: "Welcome to Lawrenceville! ✨",
};

export function locationWelcomeMessage(locationId: LocationId): string {
  return (
    LOCATION_WELCOME[locationId] ??
    `Welcome to ${getLocationConfig(locationId).shortName}!`
  );
}

const THINKING_BY_INTENT: Record<CheffyIntent, string[]> = {
  offers: ["Checking today's offers…", "Finding the best deals…"],
  location: ["Looking up your location…", "Getting directions ready…"],
  menu: ["Browsing the menu…", "Finding delicious options…"],
  vegetarian: ["Finding vegetarian favorites…", "Scanning veg specialties…"],
  recommend: ["Finding recommendations…", "Picking guest favorites…"],
  order: ["Getting order options…", "Opening online ordering…"],
  reservation: ["Checking reservation details…", "Finding booking info…"],
  catering: ["Reviewing catering options…", "Gathering event details…"],
  hours: ["Checking opening hours…", "Looking up today's timings…"],
  contact: ["Finding contact details…", "Getting phone & directions…"],
  gallery: ["Opening the gallery…", "Finding photo highlights…"],
  greeting: ["Preparing a warm welcome…"],
  faq: ["Finding the best answer…"],
  kids: ["Looking up kid-friendly options…"],
  party: ["Checking party & event info…"],
  buffet: ["Reviewing buffet details…"],
  unknown: ["Let me look into that…", "One moment please…"],
};

export function pickThinkingMessage(intent: CheffyIntent): string {
  const pool = THINKING_BY_INTENT[intent] ?? THINKING_BY_INTENT.unknown;
  return pool[Math.floor(Math.random() * pool.length)] ?? pool[0];
}

export function normalizeEmotion(emotion: CheffyEmotion): MascotPhase {
  switch (emotion) {
    case "happy":
    case "waving":
      return "greeting";
    case "typing":
      return "speaking";
    case "confused":
      return "thinking";
    default:
      return emotion;
  }
}
