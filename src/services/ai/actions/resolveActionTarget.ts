import type { CheffyAction } from "./types";

export type ResolvedActionTarget =
  | { kind: "navigate"; path: string }
  | { kind: "external"; href: string }
  | { kind: "phone"; href: string }
  | { kind: "email"; href: string }
  | { kind: "switch_location"; locationId: string };

function sanitizePhone(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

function isExternalUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function resolveActionTarget(action: CheffyAction): ResolvedActionTarget {
  switch (action.type) {
    case "phone":
      return { kind: "phone", href: `tel:${sanitizePhone(action.value)}` };
    case "email":
      return { kind: "email", href: `mailto:${action.value.trim()}` };
    case "map":
      if (isExternalUrl(action.value)) {
        return { kind: "external", href: action.value };
      }
      return {
        kind: "external",
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(action.value)}`,
      };
    case "link":
      return { kind: "external", href: action.value };
    case "switch_location":
      return { kind: "switch_location", locationId: action.value };
    case "reservation":
    case "order":
    case "menu":
    case "button":
    default:
      if (isExternalUrl(action.value)) {
        return { kind: "external", href: action.value };
      }
      return { kind: "navigate", path: action.value };
  }
}
