import { useCallback, useEffect, useState } from "react";
import {
  MENU_EXPERIENCE_CHANGE_EVENT,
  type MenuExperienceMode,
} from "./constants";
import { readMenuExperienceMode, writeMenuExperienceMode } from "./storage";

export function useMenuExperience() {
  const [mode, setModeState] = useState<MenuExperienceMode>(readMenuExperienceMode);

  useEffect(() => {
    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<MenuExperienceMode>).detail;
      if (detail) setModeState(detail);
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key) setModeState(readMenuExperienceMode());
    };

    window.addEventListener(MENU_EXPERIENCE_CHANGE_EVENT, onCustom);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(MENU_EXPERIENCE_CHANGE_EVENT, onCustom);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setMode = useCallback((next: MenuExperienceMode) => {
    writeMenuExperienceMode(next);
    setModeState(next);
  }, []);

  return { mode, setMode };
}
