export const NAV_LINKS = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Menu", path: "/menu" },
  { label: "Offers", path: "/special-offers" },
  { label: "Catering", path: "/catering" },
  { label: "Parties", path: "/parties" },
  { label: "Testimonials", path: "/testimonials" },
  { label: "Contact", path: "/contact" },
] as const;

export const FOOTER_LINKS = [
  { label: "Home", path: "/" },
  { label: "About", path: "/about" },
  { label: "Menu", path: "/menu" },
  { label: "Offers", path: "/special-offers" },
  { label: "Catering", path: "/catering" },
  { label: "Parties", path: "/parties" },
  { label: "Testimonials", path: "/testimonials" },
  { label: "Contact", path: "/contact" },
  { label: "Order Online", path: "/online-ordering" },
  { label: "Reservations", path: "/reservation" },
] as const;

export const ORDER_URL = "/online-ordering";
export const RESERVE_URL = "/reservation";

/** Fixed header height — keep sticky offsets in sync (matches h-20). */
export const NAV_BAR_HEIGHT = 80;

/** Menu category anchor offset (nav + sticky toolbar). */
export const MENU_SCROLL_MARGIN = NAV_BAR_HEIGHT + 168;

/** Routes where the navbar starts transparent over a dark hero. */
export const TRANSPARENT_NAV_ROUTES = [
  "/",
  "/about",
  "/menu",
  "/catering",
  "/parties",
  "/testimonials",
  "/contact",
  "/gallery",
  "/special-offers",
  "/online-ordering",
  "/privacy-policy",
  "/terms-conditions",
  "/reservation",
];
