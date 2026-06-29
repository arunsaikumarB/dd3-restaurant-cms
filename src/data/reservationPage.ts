import { SITE } from "../constants/site";

export interface ReservationLocation {
  id: string;
  name: string;
  address: string;
}

export const RESERVATION_LOCATIONS: ReservationLocation[] = [
  {
    id: "lawrence",
    name: "Desi Dhamaka — Lawrence Township",
    address: "540 Lawrence Square Blvd S, Lawrenceville, NJ 08648",
  },
];

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
    image: "/frames/frame_0025.jpg",
    alt: "Desi Dhamaka reception lounge",
  },
  {
    id: "dining-hall",
    label: "Dining Hall",
    image: "/frames/frame_0048.jpg",
    alt: "Main dining hall at Desi Dhamaka",
  },
  {
    id: "private-dining",
    label: "Private Dining",
    image: "/frames/frame_0055.jpg",
    alt: "Private dining room",
  },
  {
    id: "buffet",
    label: "Buffet",
    image: "/frames/frame_0092.jpg",
    alt: "Weekend buffet spread",
  },
  {
    id: "chef",
    label: "Chef",
    image: "/showcase/biryani.jpg",
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

export const RESERVATION_BANNER = "/reservation/reservation-banner.png";

/** Interior slideshow for the booking split-panel (left side). */
export const RESERVATION_INTERIOR_SLIDES = [
  {
    id: "private-dining-entrance",
    image: "/reservation/interior/interior-01.png",
    alt: "Private dining room entrance with marigold garland at Desi Dhamaka",
  },
  {
    id: "reception-lobby",
    image: "/reservation/interior/interior-02.png",
    alt: "Reception lobby with fountain and chandelier",
  },
  {
    id: "private-dining-gold",
    image: "/reservation/interior/interior-03.png",
    alt: "Private dining room with gold walls and horse statues",
  },
  {
    id: "weekend-buffet",
    image: "/reservation/interior/interior-04.png",
    alt: "Weekend buffet service at Desi Dhamaka",
  },
  {
    id: "bar-lounge",
    image: "/reservation/interior/interior-05.png",
    alt: "Bar and lounge seating area",
  },
  {
    id: "grand-lobby",
    image: "/reservation/interior/interior-06.png",
    alt: "Grand lobby with red carpet and water feature",
  },
  {
    id: "banquet-hall",
    image: "/reservation/interior/interior-07.png",
    alt: "Long banquet table in private dining hall",
  },
  {
    id: "private-room-arches",
    image: "/reservation/interior/interior-08.png",
    alt: "Private dining room with arched niches",
  },
  {
    id: "formal-private-dining",
    image: "/reservation/interior/interior-09.png",
    alt: "Formal private dining room with tapestry",
  },
  {
    id: "main-dining-chandelier",
    image: "/reservation/interior/interior-10.png",
    alt: "Main dining hall with crystal chandelier",
  },
  {
    id: "elegant-private-room",
    image: "/reservation/interior/interior-11.png",
    alt: "Elegant private dining room with gold wallpaper",
  },
  {
    id: "dining-hall-columns",
    image: "/reservation/interior/interior-12.png",
    alt: "Main dining hall with ornate columns",
  },
  {
    id: "throne-seating",
    image: "/reservation/interior/interior-13.png",
    alt: "Private dining with throne seating and crystal chandelier",
  },
  {
    id: "booth-dining",
    image: "/reservation/interior/interior-14.png",
    alt: "Booth seating in the main dining area",
  },
] as const;

