/** Chef's signature dishes for the homepage carousel. */
export interface SignatureDish {
  id: string;
  /** Display title on the card. */
  name: string;
  /** Display category label on the card. */
  category: string;
  price: number;
  image: string;
}

export const SIGNATURE_DISHES: SignatureDish[] = [
  {
    id: "chicken-dum-biryani",
    name: "Chicken Dum Biryani",
    category: "Biryani",
    price: 16.99,
    image: "/showcase/biryani.webp",
  },
  {
    id: "mutton-mandi",
    name: "Mutton Mandi",
    category: "DD Special Mandi",
    price: 47.83,
    image: "/showcase/mandi.webp",
  },
  {
    id: "butter-chicken",
    name: "Butter Chicken",
    category: "North Indian",
    price: 16.99,
    image: "/showcase/butter-chicken.webp",
  },
  {
    id: "tandoori-platter",
    name: "Tandoori Platter",
    category: "Kebab & Tandoori",
    price: 16.99,
    image: "/showcase/tandoori.webp",
  },
  {
    id: "nalli-gosht",
    name: "Nalli Gosht Mandi",
    category: "DD Special Mandi",
    price: 58.23,
    image: "/showcase/mandi.webp",
  },
  {
    id: "chicken-65",
    name: "Chicken 65",
    category: "Appetizers",
    price: 15.59,
    image: "/showcase/indo-chinese.webp",
  },
  {
    id: "paneer-tikka",
    name: "Paneer Tikka",
    category: "Kebab & Tandoori",
    price: 16.99,
    image: "/showcase/tandoori.webp",
  },
];

export const SIGNATURE_FEATURES = [
  {
    icon: "leaf",
    title: "Fresh Ingredients",
    description: "We source only the finest seasonal ingredients.",
  },
  {
    icon: "flame",
    title: "Authentic Indian Recipes",
    description: "Time-honoured techniques passed through generations.",
  },
  {
    icon: "clock",
    title: "Prepared Fresh Daily",
    description: "Every dish crafted to order in our kitchen.",
  },
  {
    icon: "star",
    title: "Exceptional Dining Experience",
    description: "Impeccable food, ambience, and hospitality.",
  },
] as const;
