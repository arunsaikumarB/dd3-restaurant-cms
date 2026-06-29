import type { ChefGaaFeaturedTarget } from "../constants/ordering";

/** Chef's signature dishes for the homepage carousel. */
export interface SignatureDish extends ChefGaaFeaturedTarget {
  id: string;
  /** Display title on the card. */
  name: string;
  /** Display category label on the card. */
  category: string;
  price: number;
  image: string;
  badge?: string;
  /** Search term used when syncing from menu.json */
  menuMatch?: string;
}

export const SIGNATURE_DISHES: SignatureDish[] = [
  {
    id: "chicken-dum-biryani",
    name: "Chicken Dum Biryani",
    category: "Biryani",
    category_name: "Biryani",
    item_name: "Chicken Dum Biryani",
    price: 16.99,
    image: "/showcase/biryani.jpg",
    badge: "Chef's Special",
    menuMatch: "Chicken Dum Biryani",
  },
  {
    id: "mutton-mandi",
    name: "Mutton Mandi",
    category: "DD Special Mandi",
    category_name: "DD SPECIAL MANDI",
    item_name: "GOAT MANDI (HALF)",
    price: 47.83,
    image: "/showcase/mandi.jpg",
    badge: "Chef's Special",
    menuMatch: "GOAT MANDI (HALF)",
  },
  {
    id: "butter-chicken",
    name: "Butter Chicken",
    category: "North Indian",
    category_name: "Non Vegetarian Entrees",
    item_name: "Butter Chicken",
    price: 16.99,
    image: "/showcase/butter-chicken.jpg",
    menuMatch: "Butter Chicken",
  },
  {
    id: "tandoori-platter",
    name: "Tandoori Platter",
    category: "Kebab & Tandoori",
    category_name: "Kebab and Tandoori",
    item_name: "Chicken Tandoori",
    price: 16.99,
    image: "/showcase/tandoori.jpg",
    badge: "Chef's Special",
    menuMatch: "Chicken Tandoori",
  },
  {
    id: "nalli-gosht",
    name: "Nalli Gosht Mandi",
    category: "DD Special Mandi",
    category_name: "DD SPECIAL MANDI",
    item_name: "DD SPECIAL NALLI GOSHT MANDI (HALF)",
    price: 58.23,
    image: "/showcase/mandi.jpg",
    badge: "Chef's Special",
    menuMatch: "DD SPECIAL NALLI GOSHT MANDI (HALF)",
  },
  {
    id: "chicken-65",
    name: "Chicken 65",
    category: "Appetizers",
    category_name: "Non Vegetarian Appetizers",
    item_name: "Chicken 65 Dry",
    price: 15.59,
    image: "/showcase/indo-chinese.jpg",
    menuMatch: "Chicken 65 Dry",
  },
  {
    id: "paneer-tikka",
    name: "Paneer Tikka",
    category: "Kebab & Tandoori",
    category_name: "Kebab and Tandoori",
    item_name: "Paneer Tikka Kebab",
    price: 16.99,
    image: "/showcase/tandoori.jpg",
    menuMatch: "Paneer Tikka Kebab",
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
