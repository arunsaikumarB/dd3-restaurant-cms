import type { CMSKnowledge } from "../../cms/knowledge";
import type { GuestSessionProfile, TimeOfDay } from "./types";

export function getTimeOfDay(date = new Date()): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "late-night";
}

export function getTimeGreeting(time: TimeOfDay = getTimeOfDay()): string {
  switch (time) {
    case "morning":
      return "Good Morning! ☀️";
    case "afternoon":
      return "Good Afternoon!";
    case "evening":
      return "Good Evening!";
    case "late-night":
      return "Hope you're having a wonderful evening.";
  }
}

export function isReturningVisitor(profile: GuestSessionProfile): boolean {
  return (profile.userMessageCount ?? 0) > 0;
}

export function buildMascotGreeting(
  knowledge: CMSKnowledge | null,
  profile: GuestSessionProfile = {},
): string {
  const restaurantName =
    knowledge?.modules.restaurantSettings.data?.name?.trim() ||
    knowledge?.locationName?.trim();
  const locationName = knowledge?.locationName?.trim();
  const timeGreeting = getTimeGreeting();
  const returning = isReturningVisitor(profile);

  if (returning) {
    const locationBit = locationName ? ` at our ${locationName} location` : "";
    return `Welcome back! 👋 Great to see you again${locationBit}. Ready for another delicious meal?`;
  }

  if (restaurantName && locationName) {
    return `Namaste! 👋 ${timeGreeting} I'm Cheffy, your dining concierge at ${restaurantName} (${locationName}). I'd be delighted to help you today.`;
  }

  if (restaurantName) {
    return `Namaste! 👋 ${timeGreeting} I'm Cheffy. Welcome to ${restaurantName}. How can I make your dining experience wonderful today?`;
  }

  return `Namaste! 👋 ${timeGreeting} I'm Cheffy, your Desi Dhamaka dining concierge. I'd be delighted to help!`;
}

export function buildNudgeMessage(profile: GuestSessionProfile = {}): string {
  if (isReturningVisitor(profile)) {
    return "Welcome back! Need help with menu, offers, or directions? 😊";
  }
  return "Need any help planning your visit? 🍛";
}
