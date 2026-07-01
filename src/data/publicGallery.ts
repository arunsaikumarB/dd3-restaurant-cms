import { EXPERIENCE_GALLERY } from "./atmosphereGallery";

export type PublicGalleryItem = {
  id: string;
  image: string;
  alt_text: string;
  title: string;
  caption: string;
  category: string;
  featured: boolean;
  display_order: number;
  section?: string;
  location_id?: string;
  page?: string;
};

const EXTRA_FRAMES: PublicGalleryItem[] = [
  {
    id: "fallback-frame-0025",
    image: "/frames/frame_0025.jpg",
    alt_text: "Restaurant lounge seating",
    title: "Restaurant lounge seating",
    caption: "Restaurant lounge seating",
    category: "Ambiance",
    featured: false,
    display_order: 5,
  },
  {
    id: "fallback-frame-0055",
    image: "/frames/frame_0055.jpg",
    alt_text: "Dining area detail",
    title: "Dining area detail",
    caption: "Dining area detail",
    category: "Ambiance",
    featured: false,
    display_order: 6,
  },
  {
    id: "fallback-frame-0070",
    image: "/frames/frame_0070.jpg",
    alt_text: "Open kitchen view",
    title: "Open kitchen view",
    caption: "Open kitchen view",
    category: "Kitchen",
    featured: false,
    display_order: 7,
  },
  {
    id: "fallback-frame-0095",
    image: "/frames/frame_0095.jpg",
    alt_text: "Evening atmosphere",
    title: "Evening atmosphere",
    caption: "Evening atmosphere",
    category: "Ambiance",
    featured: false,
    display_order: 8,
  },
  {
    id: "fallback-frame-0110",
    image: "/frames/frame_0110.jpg",
    alt_text: "Interior architecture",
    title: "Interior architecture",
    caption: "Interior architecture",
    category: "Ambiance",
    featured: false,
    display_order: 9,
  },
];

export const PUBLIC_GALLERY_FALLBACK: PublicGalleryItem[] = [
  ...EXPERIENCE_GALLERY.map((item, index) => ({
    id: item.id,
    image: item.image,
    alt_text: item.imageAlt,
    title: item.title,
    caption: item.subtitle,
    category: "Ambiance",
    featured: index === 0,
    display_order: index,
  })),
  ...EXTRA_FRAMES,
];
