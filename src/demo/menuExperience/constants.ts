/** Temporary demo feature — remove `src/demo/menuExperience/` to drop this switch. */

export const MENU_EXPERIENCE_STORAGE_KEY = "dd3_demo_menu_experience";

export const MENU_EXPERIENCE_CHANGE_EVENT = "dd3:menu-experience-change";

export type MenuExperienceMode = "interactive" | "direct-ordering";

export const MENU_EXPERIENCE_OPTIONS: ReadonlyArray<{
  value: MenuExperienceMode;
  label: string;
}> = [
  { value: "interactive", label: "Interactive Website Menu" },
  { value: "direct-ordering", label: "Direct Online Ordering" },
] as const;

export const DEFAULT_MENU_EXPERIENCE_MODE: MenuExperienceMode = "interactive";

export function isDirectOrderingMode(mode: MenuExperienceMode): boolean {
  return mode === "direct-ordering";
}
