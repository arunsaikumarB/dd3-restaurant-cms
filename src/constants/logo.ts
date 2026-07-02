/** Logo assets in `public/` — pick by background. */
export const LOGO = {
  /** Black/dark tagline — ivory and light backgrounds */
  onIvory: "/DD%20logo.webp?v=2",
  /** White tagline — dark or transparent backgrounds */
  onDark: "/Bold-01.webp?v=1",
  alt: "Desi Dhamaka Indian Restaurant",
} as const;

/** `ivory` = light page background; `dark` = hero, transparent nav, dark sections */
export type LogoBackground = "ivory" | "dark";

export function logoSrcForBackground(background: LogoBackground): string {
  return background === "ivory" ? LOGO.onIvory : LOGO.onDark;
}
