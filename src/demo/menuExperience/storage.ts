import {
  DEFAULT_MENU_EXPERIENCE_MODE,
  MENU_EXPERIENCE_CHANGE_EVENT,
  MENU_EXPERIENCE_STORAGE_KEY,
  type MenuExperienceMode,
} from "./constants";

export function readMenuExperienceMode(): MenuExperienceMode {
  try {
    const stored = window.localStorage.getItem(MENU_EXPERIENCE_STORAGE_KEY);
    if (stored === "direct-ordering") return "direct-ordering";
    if (stored === "interactive") return "interactive";
  } catch {
    /* ignore */
  }
  return DEFAULT_MENU_EXPERIENCE_MODE;
}

export function writeMenuExperienceMode(mode: MenuExperienceMode): void {
  window.localStorage.setItem(MENU_EXPERIENCE_STORAGE_KEY, mode);
  window.dispatchEvent(
    new CustomEvent<MenuExperienceMode>(MENU_EXPERIENCE_CHANGE_EVENT, { detail: mode }),
  );
}
