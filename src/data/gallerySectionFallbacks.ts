import type { PublicGalleryItem } from "./publicGallery";
import { EXPERIENCE_GALLERY } from "./atmosphereGallery";
import { ABOUT_FLOATING_IMAGE, ABOUT_MAIN_IMAGE } from "./aboutSection";

function item(
  partial: Omit<PublicGalleryItem, "featured"> & { featured?: boolean },
): PublicGalleryItem {
  return { featured: false, ...partial };
}

export const AMBIENCE_GALLERY_FALLBACK: PublicGalleryItem[] = EXPERIENCE_GALLERY.map(
  (entry, index) =>
    item({
      id: entry.id,
      image: entry.image,
      alt_text: entry.imageAlt,
      title: entry.title,
      caption: entry.subtitle,
      category: "Ambiance",
      display_order: index + 1,
      section: "ambience",
    }),
);

export const HOME_ABOUT_FOOD_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "home-about-food",
    image: ABOUT_MAIN_IMAGE.src,
    alt_text: ABOUT_MAIN_IMAGE.alt,
    title: "Authentic cuisine",
    caption: "",
    category: "Food",
    display_order: 1,
    section: "home_about_food",
  }),
];

export const HOME_ABOUT_INTERIOR_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "home-about-interior",
    image: ABOUT_FLOATING_IMAGE.src,
    alt_text: ABOUT_FLOATING_IMAGE.alt,
    title: "Restaurant interior",
    caption: "",
    category: "Ambiance",
    display_order: 1,
    section: "home_about_interior",
  }),
];

export const HERO_BACKGROUND_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "hero-background",
    image: "/hero/hero-poster.jpg",
    alt_text: "Desi Dhamaka restaurant entrance",
    title: "Hero",
    caption: "",
    category: "Ambiance",
    display_order: 1,
    section: "hero_background",
  }),
];

export const CHOOSE_EXPERIENCE_MENU_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "choose-menu",
    image: "/showcase/biryani.jpg",
    alt_text: "Premium biryani",
    title: "The Menu",
    caption: "",
    category: "Food",
    display_order: 1,
    section: "choose_experience_menu",
  }),
];

export const CHOOSE_EXPERIENCE_ORDER_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "choose-order",
    image: "/showcase/tandoori.jpg",
    alt_text: "Tandoori platter",
    title: "Order Online",
    caption: "",
    category: "Food",
    display_order: 1,
    section: "choose_experience_order",
  }),
];

export const CHOOSE_EXPERIENCE_VISIT_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "choose-visit",
    image: "/frames/frame_0060.jpg",
    alt_text: "Restaurant interior",
    title: "Reservations",
    caption: "",
    category: "Ambiance",
    display_order: 1,
    section: "choose_experience_visit",
  }),
];

export const ABOUT_HERO_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "about-hero",
    image: "/showcase/mandi.jpg",
    alt_text: "Desi Dhamaka restaurant",
    title: "About hero",
    caption: "",
    category: "Ambiance",
    display_order: 1,
    section: "about_hero",
  }),
];

export const ABOUT_TRADITION_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "about-tradition",
    image: "/showcase/tandoori.jpg",
    alt_text: "Tandoori platter at Desi Dhamaka",
    title: "Tradition",
    caption: "",
    category: "Food",
    display_order: 1,
    section: "about_tradition",
  }),
];

export const ABOUT_FLAVOURS_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "about-flavours",
    image: "/showcase/butter-chicken.jpg",
    alt_text: "Authentic Indian cuisine",
    title: "Flavours",
    caption: "",
    category: "Food",
    display_order: 1,
    section: "about_flavours",
  }),
];

export const ABOUT_CRAFTED_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "about-crafted",
    image: "/showcase/indo-chinese.jpg",
    alt_text: "Chef preparing cuisine",
    title: "Crafted with passion",
    caption: "",
    category: "Kitchen",
    display_order: 1,
    section: "about_crafted",
  }),
];

export const ABOUT_JOURNEY_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "about-journey-1",
    image: "/showcase/biryani.jpg",
    alt_text: "Biryani",
    title: "Biryani",
    caption: "",
    category: "Food",
    display_order: 1,
    section: "about_journey",
  }),
  item({
    id: "about-journey-2",
    image: "/showcase/desserts-falooda.jpg",
    alt_text: "Desserts",
    title: "Desserts",
    caption: "",
    category: "Food",
    display_order: 2,
    section: "about_journey",
  }),
  item({
    id: "about-journey-3",
    image: "/showcase/mandi.jpg",
    alt_text: "Mandi",
    title: "Mandi",
    caption: "",
    category: "Food",
    display_order: 3,
    section: "about_journey",
  }),
];

export const MENU_HERO_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "menu-hero",
    image: "/showcase/biryani.jpg",
    alt_text: "Menu hero",
    title: "Menu",
    caption: "",
    category: "Food",
    display_order: 1,
    section: "menu_hero",
  }),
];

export const OFFERS_HERO_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "offers-hero",
    image: "/showcase/biryani.jpg",
    alt_text: "Offers hero",
    title: "Offers",
    caption: "",
    category: "Food",
    display_order: 1,
    section: "offers_hero",
  }),
];

export const CATERING_HERO_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "catering-hero",
    image: "/showcase/biryani.jpg",
    alt_text: "Catering hero",
    title: "Catering",
    caption: "",
    category: "Events",
    display_order: 1,
    section: "catering_hero",
  }),
];

export const CATERING_CORPORATE_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "catering-corporate",
    image: "/showcase/indo-chinese.jpg",
    alt_text: "Corporate Events",
    title: "Corporate Events",
    caption: "",
    category: "Events",
    display_order: 1,
    section: "catering_corporate",
  }),
];

export const CATERING_WEDDING_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "catering-wedding",
    image: "/showcase/biryani.jpg",
    alt_text: "Wedding Catering",
    title: "Wedding Catering",
    caption: "",
    category: "Events",
    display_order: 1,
    section: "catering_wedding",
  }),
];

export const CATERING_BIRTHDAY_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "catering-birthday",
    image: "/showcase/desserts-falooda.jpg",
    alt_text: "Birthday Parties",
    title: "Birthday Parties",
    caption: "",
    category: "Events",
    display_order: 1,
    section: "catering_birthday",
  }),
];

export const CATERING_LIVE_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "catering-live",
    image: "/showcase/tandoori.jpg",
    alt_text: "Live Counters",
    title: "Live Counters",
    caption: "",
    category: "Events",
    display_order: 1,
    section: "catering_live",
  }),
];

export const CATERING_CUSTOM_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "catering-custom",
    image: "/showcase/mandi.jpg",
    alt_text: "Custom Menus",
    title: "Custom Menus",
    caption: "",
    category: "Events",
    display_order: 1,
    section: "catering_custom",
  }),
];

export const PARTIES_HERO_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "parties-hero",
    image: "/showcase/desserts-falooda.jpg",
    alt_text: "Parties hero",
    title: "Parties",
    caption: "",
    category: "Events",
    display_order: 1,
    section: "parties_hero",
  }),
];

export const PARTIES_GALLERY_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "parties-1",
    image: "/showcase/biryani.jpg",
    alt_text: "Private dining setup",
    title: "Private dining",
    caption: "",
    category: "Events",
    display_order: 1,
    section: "parties_gallery",
  }),
  item({
    id: "parties-2",
    image: "/showcase/tandoori.jpg",
    alt_text: "Celebration feast",
    title: "Celebration feast",
    caption: "",
    category: "Events",
    display_order: 2,
    section: "parties_gallery",
  }),
  item({
    id: "parties-3",
    image: "/showcase/butter-chicken.jpg",
    alt_text: "Event catering",
    title: "Event catering",
    caption: "",
    category: "Events",
    display_order: 3,
    section: "parties_gallery",
  }),
  item({
    id: "parties-4",
    image: "/showcase/mandi.jpg",
    alt_text: "Party arrangement",
    title: "Party arrangement",
    caption: "",
    category: "Events",
    display_order: 4,
    section: "parties_gallery",
  }),
];

export const TESTIMONIALS_HERO_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "testimonials-hero",
    image: "/showcase/butter-chicken.jpg",
    alt_text: "Testimonials hero",
    title: "Testimonials",
    caption: "",
    category: "Food",
    display_order: 1,
    section: "testimonials_hero",
  }),
];

export const CONTACT_HERO_FALLBACK: PublicGalleryItem[] = [
  item({
    id: "contact-hero",
    image: "/showcase/mandi.jpg",
    alt_text: "Contact hero",
    title: "Contact",
    caption: "",
    category: "Ambiance",
    display_order: 1,
    section: "contact_hero",
  }),
];

export const GALLERY_SECTION_FALLBACKS: Record<string, PublicGalleryItem[]> = {
  hero_background: HERO_BACKGROUND_FALLBACK,
  home_about_food: HOME_ABOUT_FOOD_FALLBACK,
  home_about_interior: HOME_ABOUT_INTERIOR_FALLBACK,
  ambience: AMBIENCE_GALLERY_FALLBACK,
  choose_experience_menu: CHOOSE_EXPERIENCE_MENU_FALLBACK,
  choose_experience_order: CHOOSE_EXPERIENCE_ORDER_FALLBACK,
  choose_experience_visit: CHOOSE_EXPERIENCE_VISIT_FALLBACK,
  about_hero: ABOUT_HERO_FALLBACK,
  about_tradition: ABOUT_TRADITION_FALLBACK,
  about_flavours: ABOUT_FLAVOURS_FALLBACK,
  about_crafted: ABOUT_CRAFTED_FALLBACK,
  about_journey: ABOUT_JOURNEY_FALLBACK,
  menu_hero: MENU_HERO_FALLBACK,
  offers_hero: OFFERS_HERO_FALLBACK,
  catering_hero: CATERING_HERO_FALLBACK,
  catering_corporate: CATERING_CORPORATE_FALLBACK,
  catering_wedding: CATERING_WEDDING_FALLBACK,
  catering_birthday: CATERING_BIRTHDAY_FALLBACK,
  catering_live: CATERING_LIVE_FALLBACK,
  catering_custom: CATERING_CUSTOM_FALLBACK,
  parties_hero: PARTIES_HERO_FALLBACK,
  parties_gallery: PARTIES_GALLERY_FALLBACK,
  testimonials_hero: TESTIMONIALS_HERO_FALLBACK,
  contact_hero: CONTACT_HERO_FALLBACK,
};

export function getGallerySectionFallback(section: string): PublicGalleryItem[] {
  return GALLERY_SECTION_FALLBACKS[section] ?? [];
}
