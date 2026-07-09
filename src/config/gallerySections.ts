export type GalleryPageKey =
  | "home"
  | "about"
  | "menu"
  | "offers"
  | "catering"
  | "parties"
  | "testimonials"
  | "contact"
  | "order";

export type GallerySectionKey =
  | "hero_background"
  | "home_about_food"
  | "home_about_interior"
  | "ambience"
  | "choose_experience_menu"
  | "choose_experience_order"
  | "choose_experience_visit"
  | "about_hero"
  | "about_tradition"
  | "about_flavours"
  | "about_crafted"
  | "about_journey"
  | "menu_hero"
  | "offers_hero"
  | "catering_hero"
  | "catering_corporate"
  | "catering_wedding"
  | "catering_birthday"
  | "catering_live"
  | "catering_custom"
  | "parties_hero"
  | "parties_gallery"
  | "testimonials_hero"
  | "contact_hero"
  | "order_hero"
  | "general";

export interface GallerySectionDefinition {
  key: GallerySectionKey;
  label: string;
  description: string;
  /** 0 = unlimited */
  maxImages: number;
  hasTitle?: boolean;
  hasCaption?: boolean;
}

export interface GalleryPageDefinition {
  page: GalleryPageKey;
  label: string;
  sections: GallerySectionDefinition[];
}

export const GALLERY_PAGE_SECTIONS: GalleryPageDefinition[] = [
  {
    page: "home",
    label: "Home",
    sections: [
      {
        key: "hero_background",
        label: "Hero Background",
        description: "Main homepage hero background image (poster)",
        maxImages: 1,
      },
      {
        key: "home_about_food",
        label: "About — Food Image",
        description: "Large food photo in the home about section",
        maxImages: 1,
      },
      {
        key: "home_about_interior",
        label: "About — Interior Image",
        description: "Small interior overlay photo in home about section",
        maxImages: 1,
      },
      {
        key: "ambience",
        label: "Experience the Ambience",
        description: "Venue and interior photos shown as cards",
        maxImages: 0,
        hasTitle: true,
        hasCaption: true,
      },
      {
        key: "choose_experience_menu",
        label: "Choose Experience — Menu Card",
        description: "Food image on the menu experience card",
        maxImages: 1,
      },
      {
        key: "choose_experience_order",
        label: "Choose Experience — Order Card",
        description: "Food image on the order online card",
        maxImages: 1,
      },
      {
        key: "choose_experience_visit",
        label: "Choose Experience — Visit Card",
        description: "Interior image on the reservations card",
        maxImages: 1,
      },
    ],
  },
  {
    page: "about",
    label: "About",
    sections: [
      {
        key: "about_hero",
        label: "Hero Background",
        description: "About page hero background",
        maxImages: 1,
      },
      {
        key: "about_tradition",
        label: "Where Tradition Meets",
        description: "Right side food image in the story section",
        maxImages: 1,
      },
      {
        key: "about_flavours",
        label: "Flavours from Every Region",
        description: "Left side food image in the cuisine section",
        maxImages: 1,
      },
      {
        key: "about_crafted",
        label: "Crafted with Passion",
        description: "Food image in the dark culinary team section",
        maxImages: 1,
      },
      {
        key: "about_journey",
        label: "Our Journey Gallery",
        description: "Bottom showcase images (3 or more)",
        maxImages: 0,
      },
    ],
  },
  {
    page: "menu",
    label: "Menu",
    sections: [
      {
        key: "menu_hero",
        label: "Hero Background",
        description: "Menu page hero background",
        maxImages: 1,
      },
    ],
  },
  {
    page: "offers",
    label: "Offers",
    sections: [
      {
        key: "offers_hero",
        label: "Hero Background",
        description: "Offers page hero background",
        maxImages: 1,
      },
    ],
  },
  {
    page: "catering",
    label: "Catering",
    sections: [
      { key: "catering_hero", label: "Hero Background", description: "Catering page hero", maxImages: 1 },
      { key: "catering_corporate", label: "Corporate Events", description: "Corporate events block image", maxImages: 1 },
      { key: "catering_wedding", label: "Wedding Catering", description: "Wedding catering block image", maxImages: 1 },
      { key: "catering_birthday", label: "Birthday Parties", description: "Birthday parties block image", maxImages: 1 },
      { key: "catering_live", label: "Live Counters", description: "Live counters block image", maxImages: 1 },
      { key: "catering_custom", label: "Custom Menus", description: "Custom menus block image", maxImages: 1 },
    ],
  },
  {
    page: "parties",
    label: "Parties",
    sections: [
      { key: "parties_hero", label: "Hero Background", description: "Parties page hero", maxImages: 1 },
      {
        key: "parties_gallery",
        label: "Moments We Create",
        description: "Photo gallery grid (4 or more images)",
        maxImages: 0,
      },
    ],
  },
  {
    page: "testimonials",
    label: "Testimonials",
    sections: [
      { key: "testimonials_hero", label: "Hero Background", description: "Testimonials page hero", maxImages: 1 },
    ],
  },
  {
    page: "contact",
    label: "Contact",
    sections: [
      { key: "contact_hero", label: "Hero Background", description: "Contact page hero", maxImages: 1 },
    ],
  },
  {
    page: "order",
    label: "Order",
    sections: [
      { key: "order_hero", label: "Hero Background", description: "Order Online page hero", maxImages: 1 },
    ],
  },
];

const SECTION_MAP = new Map<GallerySectionKey, GallerySectionDefinition & { page: GalleryPageKey }>();

for (const pageDef of GALLERY_PAGE_SECTIONS) {
  for (const section of pageDef.sections) {
    SECTION_MAP.set(section.key, { ...section, page: pageDef.page });
  }
}

export function getGallerySectionDefinition(
  section: GallerySectionKey,
): (GallerySectionDefinition & { page: GalleryPageKey }) | undefined {
  return SECTION_MAP.get(section);
}

export function getPageFromSection(section: string): GalleryPageKey {
  return SECTION_MAP.get(section as GallerySectionKey)?.page ?? "home";
}

export function listAllGallerySectionKeys(): GallerySectionKey[] {
  return [...SECTION_MAP.keys()];
}

export const GALLERY_ADMIN_LOCATIONS = [
  { value: "south-plainfield", label: "South Plainfield" },
  { value: "oak-tree", label: "Oak Tree" },
  { value: "lawrenceville", label: "Lawrenceville" },
] as const;

export type GalleryAdminLocationId = (typeof GALLERY_ADMIN_LOCATIONS)[number]["value"];
