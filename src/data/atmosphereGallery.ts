export interface ExperienceGalleryItem {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  imageAlt: string;
}

export const EXPERIENCE_GALLERY: ExperienceGalleryItem[] = [
  {
    id: "reception",
    title: "Reception",
    subtitle: "Your First Welcome",
    image: "/frames/frame_0025.webp",
    imageAlt: "Desi Dhamaka reception lounge",
  },
  {
    id: "private-dining",
    title: "Private Dining",
    subtitle: "Celebrate Together",
    image: "/frames/frame_0055.webp",
    imageAlt: "Private dining room at Desi Dhamaka",
  },
  {
    id: "main-dining",
    title: "Main Dining Hall",
    subtitle: "Elegant Dining Spaces",
    image: "/frames/frame_0048.webp",
    imageAlt: "Main dining hall",
  },
  {
    id: "family-seating",
    title: "Family Seating",
    subtitle: "Comfort for Every Guest",
    image: "/frames/frame_0038.webp",
    imageAlt: "Family seating area",
  },
  {
    id: "buffet",
    title: "Buffet Area",
    subtitle: "Authentic Indian Buffet",
    image: "/frames/frame_0092.webp",
    imageAlt: "Authentic Indian buffet",
  },
];

export const EXPERIENCE_FEATURES = [
  {
    icon: "cuisine" as const,
    title: "Authentic Indian Cuisine",
    description: "Traditional recipes from across India.",
  },
  {
    icon: "ingredients" as const,
    title: "Premium Ingredients",
    description: "Only the finest quality sourced daily.",
  },
  {
    icon: "fresh" as const,
    title: "Freshly Prepared",
    description: "Every dish made to order with care.",
  },
  {
    icon: "luxury" as const,
    title: "Luxury Dining",
    description: "An elegant setting for every occasion.",
  },
  {
    icon: "hospitality" as const,
    title: "Exceptional Hospitality",
    description: "Warm service that makes you feel at home.",
  },
];

export const RIBBON_ANNOUNCEMENTS = [
  "Live Weekend Buffet",
  "Authentic Hyderabadi Dum Biryani",
  "Catering Available",
  "Reserve Your Table",
];

/** @deprecated use EXPERIENCE_GALLERY */
export const ATMOSPHERE_GALLERY = EXPERIENCE_GALLERY;
