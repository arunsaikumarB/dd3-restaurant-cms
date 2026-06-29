export type PublicReview = {
  id: string;
  name: string;
  text: string;
  rating: number;
  source: string;
  featured: boolean;
  created_at: string;
};

export const PUBLIC_REVIEWS_FALLBACK: PublicReview[] = [
  {
    id: "fallback-priya-sharma",
    name: "Priya Sharma",
    text: "The biryani here is unlike anything else in the city. Aromatic, perfectly spiced and served with genuine warmth. Desi Dhamaka has become our family's favourite.",
    rating: 5,
    source: "Google Review",
    featured: true,
    created_at: "2026-05-01T00:00:00.000Z",
  },
  {
    id: "fallback-james-mitchell",
    name: "James Mitchell",
    text: "We hosted our anniversary dinner in the private room — impeccable service, stunning presentation and flavours that transported us. Truly a premium experience.",
    rating: 5,
    source: "Google Review",
    featured: true,
    created_at: "2026-05-15T00:00:00.000Z",
  },
  {
    id: "fallback-aisha-khan",
    name: "Aisha Khan",
    text: "From the mandi to the falooda, every dish exceeded expectations. The attention to detail and hospitality makes this a standout Indian restaurant.",
    rating: 5,
    source: "Google Review",
    featured: false,
    created_at: "2026-05-20T00:00:00.000Z",
  },
  {
    id: "fallback-robert-chen",
    name: "Robert Chen",
    text: "Catered our corporate event for 120 guests. Live tandoor counter was a hit. Professional team, on-time setup and restaurant-quality food at scale.",
    rating: 5,
    source: "Google Review",
    featured: false,
    created_at: "2026-06-01T00:00:00.000Z",
  },
];
