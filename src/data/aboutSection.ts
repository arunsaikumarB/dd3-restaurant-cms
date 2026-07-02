export const ABOUT_MAIN_IMAGE = {
  src: "/showcase/biryani.webp",
  alt: "A beautiful spread of authentic Indian cuisine at Desi Dhamaka",
};

export const ABOUT_FLOATING_IMAGE = {
  src: "/reservation/interior/interior-02.webp",
  alt: "Desi Dhamaka restaurant reception and dining atmosphere",
};

export const ABOUT_PARAGRAPHS = [
  "At Desi Dhamaka, we bring the soul of Hyderabad and Andhra Pradesh to your table — rich biryanis, bold curries, and time-honoured recipes passed down through generations.",
  "Every dish begins with fresh, quality ingredients, prepared to order with care and served in a welcoming space designed for families, celebrations, and quiet evenings alike.",
  "Our team believes hospitality is as essential as spice — warm welcomes, attentive service, and the comfort of knowing every meal is halal and crafted with integrity.",
];

export const ABOUT_QUOTE =
  "Every meal we serve is prepared with tradition, passion, and the warmth of Indian hospitality.";

export const ABOUT_FEATURES = [
  {
    id: "recipes",
    title: "Authentic Recipes",
    icon: "recipes" as const,
  },
  {
    id: "ingredients",
    title: "Fresh Ingredients",
    icon: "ingredients" as const,
  },
  {
    id: "family",
    title: "Family Friendly",
    icon: "family" as const,
  },
  {
    id: "halal",
    title: "Halal Cuisine",
    icon: "halal" as const,
  },
] as const;
