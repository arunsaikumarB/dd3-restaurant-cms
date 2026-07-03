import { MENU_EXPERIENCE_OPTIONS } from "./constants";
import { useMenuExperience } from "./useMenuExperience";
import "./menuExperience.css";

/**
 * Temporary management demo control.
 * Remove this component (and `src/demo/menuExperience/`) when the review is complete.
 */
export default function MenuExperienceSwitch() {
  const { mode, setMode } = useMenuExperience();

  return (
    <div className="menu-experience-demo" role="region" aria-label="Menu experience demo switch">
      <span className="menu-experience-demo__badge">Demo</span>
      <label className="menu-experience-demo__label" htmlFor="menu-experience-select">
        Menu Experience
      </label>
      <select
        id="menu-experience-select"
        className="menu-experience-demo__select"
        value={mode}
        onChange={(event) => setMode(event.target.value as typeof mode)}
      >
        {MENU_EXPERIENCE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
