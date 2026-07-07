export type MascotCelebrateReason =
  | "map"
  | "order"
  | "menu"
  | "link"
  | "reservation"
  | "switch_location";

const CELEBRATE_TYPES = new Set<MascotCelebrateReason>([
  "map",
  "order",
  "menu",
  "link",
  "reservation",
]);

export function shouldCelebrateAction(type: string): type is MascotCelebrateReason {
  return CELEBRATE_TYPES.has(type as MascotCelebrateReason);
}

export function dispatchMascotCelebrate(reason: MascotCelebrateReason): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("cheffy:mascot-celebrate", { detail: { reason } }),
  );
}
