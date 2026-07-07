import { AI_SECTIONS } from "../../../services/aiAdmin/defaults";
import { useAdminTheme } from "../../context/AdminThemeContext";

type AISectionNavProps = {
  active?: string;
};

export default function AISectionNav({ active }: AISectionNavProps) {
  const { dark } = useAdminTheme();

  return (
    <nav className="ai-concierge-nav" aria-label="AI Concierge sections">
      <ul className="ai-concierge-nav__list">
        {AI_SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#ai-section-${section.id}`}
              className={[
                "ai-concierge-nav__link",
                active === section.id ? "ai-concierge-nav__link--active" : "",
                dark ? "ai-concierge-nav__link--dark" : "",
              ].join(" ")}
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
