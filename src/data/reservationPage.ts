import { SITE } from "../constants/site";

import { getLocationConfig } from "../config/locations";

const SOUTH_PLAINFIELD = getLocationConfig("south-plainfield");

export interface ReservationLocation {
  id: string;
  name: string;
  address: string;
}

/** South Plainfield only — reservation page is location-specific. */
export const RESERVATION_LOCATIONS: ReservationLocation[] = [
  {
    id: "south-plainfield",
    name: `Desi Dhamaka — ${SOUTH_PLAINFIELD.shortName}`,
    address: SOUTH_PLAINFIELD.address.replace(/\n/g, ", "),
  },
];

export const RESERVATION_HERO_FEATURES = [
  { id: "cuisine", title: "Authentic Cuisine", icon: "cuisine" as const },
  { id: "family", title: "Family Friendly", icon: "family" as const },
  { id: "ingredients", title: "Fresh Ingredients", icon: "ingredients" as const },
  { id: "reservations", title: "Easy Reservations", icon: "reservations" as const },
] as const;

export const RESERVATION_WHY_DINE = [
  {
    id: "cuisine",
    title: "Authentic Indian Cuisine",
    description:
      "Traditional recipes from across India, prepared with premium spices and time-honoured technique.",
    icon: "cuisine" as const,
  },
  {
    id: "ingredients",
    title: "Fresh Ingredients",
    description: "Quality produce and whole spices selected daily for vibrant, unforgettable flavour.",
    icon: "ingredients" as const,
  },
  {
    id: "hospitality",
    title: "Warm Hospitality",
    description: "Attentive service in an elegant setting — every guest welcomed like family.",
    icon: "hospitality" as const,
  },
  {
    id: "private",
    title: "Private Dining Available",
    description: "Intimate rooms and bespoke menus for celebrations, meetings, and special evenings.",
    icon: "private" as const,
  },
] as const;

export const RESERVATION_TIMELINE = [
  {
    id: "date",
    title: "Choose Date",
    description: "Pick your preferred evening and party size.",
  },
  {
    id: "reserve",
    title: "Reserve Table",
    description: "Submit your details — we prepare your table with care.",
  },
  {
    id: "confirm",
    title: "Confirmation",
    description: "Receive confirmation from our hospitality team shortly.",
  },
  {
    id: "enjoy",
    title: "Enjoy Your Meal",
    description: "Arrive, relax, and savour an unforgettable dining experience.",
  },
] as const;

export const RESERVATION_POLICIES = [
  {
    id: "cancellation",
    title: "Cancellation Policy",
    description:
      "Please notify us at least 2 hours before your reservation if your plans change. For large parties, 24 hours notice is appreciated.",
  },
  {
    id: "arrival",
    title: "Arrival Time",
    description:
      "We hold tables for 15 minutes past your reservation time. Contact us if you are running late.",
  },
  {
    id: "groups",
    title: "Group Booking",
    description:
      "Parties of 8 or more may require a set menu or deposit. Our team will reach out to coordinate details.",
  },
  {
    id: "requests",
    title: "Special Requests",
    description:
      "Allergies, celebrations, and seating preferences can be noted in the form — we do our best to accommodate.",
  },
  {
    id: "parking",
    title: "Parking Information",
    description:
      "Complimentary parking is available in the restaurant lot on Hadley Road, South Plainfield.",
  },
] as const;

export const RESERVATION_STATS = [
  { id: "rating", label: "Google Rating", value: "★★★★★", accent: true },
  { id: "dishes", label: "Authentic Dishes", value: "300+" },
  { id: "private", label: "Private Dining", value: "Available" },
  { id: "buffet", label: "Weekend Buffet", value: "Live" },
] as const;

export const RESERVATION_FEATURES = [
  {
    id: "cuisine",
    title: "Authentic Indian Cuisine",
    description:
      "Traditional recipes from across India, prepared with premium ingredients and timeless technique.",
    icon: "cuisine" as const,
  },
  {
    id: "luxury",
    title: "Luxury Dining Experience",
    description:
      "An elegant atmosphere with warm hospitality — every detail curated for memorable evenings.",
    icon: "luxury" as const,
  },
  {
    id: "events",
    title: "Private Events",
    description:
      "Dedicated spaces for celebrations, corporate gatherings, and intimate private dining.",
    icon: "events" as const,
  },
  {
    id: "family",
    title: "Family Friendly",
    description:
      "Spacious seating and a welcoming menu for guests of every age and palate.",
    icon: "family" as const,
  },
] as const;

export const RESERVATION_GALLERY = [
  {
    id: "reception",
    label: "Reception",
    image: "/frames/frame_0025.webp",
    alt: "Desi Dhamaka reception lounge",
  },
  {
    id: "dining-hall",
    label: "Dining Hall",
    image: "/frames/frame_0048.webp",
    alt: "Main dining hall at Desi Dhamaka",
  },
  {
    id: "private-dining",
    label: "Private Dining",
    image: "/frames/frame_0055.webp",
    alt: "Private dining room",
  },
  {
    id: "buffet",
    label: "Buffet",
    image: "/frames/frame_0092.webp",
    alt: "Weekend buffet spread",
  },
  {
    id: "chef",
    label: "Chef",
    image: "/showcase/biryani.webp",
    alt: "Chef preparing authentic Indian cuisine",
  },
] as const;

export const RESERVATION_CONTACT = [
  {
    id: "phone",
    title: "Call Us",
    value: SITE.phone,
    href: `tel:${SITE.phone.replace(/\D/g, "")}`,
    icon: "phone" as const,
  },
  {
    id: "email",
    title: "Email",
    value: SITE.email,
    href: `mailto:${SITE.email}`,
    icon: "email" as const,
  },
  {
    id: "visit",
    title: "Visit Us",
    value: RESERVATION_LOCATIONS[0].address,
    href: undefined,
    icon: "location" as const,
  },
  {
    id: "hours",
    title: "Business Hours",
    value: SITE.hours.map((row) => `${row.days}: ${row.time}`).join(" · "),
    href: undefined,
    icon: "clock" as const,
  },
] as const;

export const RESERVATION_BANNER = "/reservation/reservation-banner.webp";

/** Interior slideshow for the booking split-panel (left side). */
export const RESERVATION_INTERIOR_SLIDES = [
  {
    id: "private-dining-entrance",
    image: "/reservation/interior/interior-01.webp",
    alt: "Private dining room entrance with marigold garland at Desi Dhamaka",
  },
  {
    id: "reception-lobby",
    image: "/reservation/interior/interior-02.webp",
    alt: "Reception lobby with fountain and chandelier",
  },
  {
    id: "private-dining-gold",
    image: "/reservation/interior/interior-03.webp",
    alt: "Private dining room with gold walls and horse statues",
  },
  {
    id: "weekend-buffet",
    image: "/reservation/interior/interior-04.webp",
    alt: "Weekend buffet service at Desi Dhamaka",
  },
  {
    id: "bar-lounge",
    image: "/reservation/interior/interior-05.webp",
    alt: "Bar and lounge seating area",
  },
  {
    id: "grand-lobby",
    image: "/reservation/interior/interior-06.webp",
    alt: "Grand lobby with red carpet and water feature",
  },
  {
    id: "banquet-hall",
    image: "/reservation/interior/interior-07.webp",
    alt: "Long banquet table in private dining hall",
  },
  {
    id: "private-room-arches",
    image: "/reservation/interior/interior-08.webp",
    alt: "Private dining room with arched niches",
  },
  {
    id: "formal-private-dining",
    image: "/reservation/interior/interior-09.webp",
    alt: "Formal private dining room with tapestry",
  },
  {
    id: "main-dining-chandelier",
    image: "/reservation/interior/interior-10.webp",
    alt: "Main dining hall with crystal chandelier",
  },
  {
    id: "elegant-private-room",
    image: "/reservation/interior/interior-11.webp",
    alt: "Elegant private dining room with gold wallpaper",
  },
  {
    id: "dining-hall-columns",
    image: "/reservation/interior/interior-12.webp",
    alt: "Main dining hall with ornate columns",
  },
  {
    id: "throne-seating",
    image: "/reservation/interior/interior-13.webp",
    alt: "Private dining with throne seating and crystal chandelier",
  },
  {
    id: "booth-dining",
    image: "/reservation/interior/interior-14.webp",
    alt: "Booth seating in the main dining area",
  },
] as const;

