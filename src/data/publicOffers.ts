export type PublicOffer = {
  id: string;
  title: string;
  description: string;
  banner: string | null;
  discount: string;
  start_date: string;
  end_date: string;
  created_at: string;
  originalPrice?: string;
  offerPrice?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

const FALLBACK_BANNER = "/showcase/biryani.jpg";

export const PUBLIC_OFFERS_FALLBACK: PublicOffer[] = [
  {
    id: "fallback-weekend-biryani",
    title: "Weekend Biryani Special",
    description: "Enjoy our signature dum biryani at a special price every weekend.",
    banner: FALLBACK_BANNER,
    discount: "15% OFF",
    start_date: "2026-06-01",
    end_date: "2099-12-31",
    created_at: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "fallback-family-feast",
    title: "Family Feast Combo",
    description: "Feed the whole family with curated platters and shared favourites.",
    banner: "/showcase/tandoori.jpg",
    discount: "$10 OFF",
    start_date: "2026-06-15",
    end_date: "2099-12-31",
    created_at: "2026-06-15T00:00:00.000Z",
  },
];
