export type OfferContentSection = {
  eyebrow?: string;
  heading: string;
  paragraphs: string[];
  list?: string[];
};

export type LocationOffer = {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: OfferContentSection[];
  image: string;
  gallery: string[];
  badge: string | null;
  price: string | null;
  validUntil: string | null;
  terms: string[];
  /** Display category label for the offer. */
  category?: string | null;
  /** ChefGaa / menu category for Order Now deep linking. */
  orderCategory: string | null;
  featured?: boolean;
};
