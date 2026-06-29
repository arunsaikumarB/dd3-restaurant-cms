import { ORDER_DIRECT_URL } from "../constants/ordering";

export { ORDER_DIRECT_URL };
export const UBER_EATS_URL =
  "https://www.ubereats.com/store/desi-dhamaka-lawrence-township/kiykavZIUSO5gjxyTB_BOA";

export interface OrderOption {
  id: string;
  brand: string;
  title: string;
  badge: string;
  description: string;
  image: string;
  imageAlt: string;
  pills: string[];
  buttonText: string;
  buttonHref: string;
  buttonColor: "#ED3C18" | "#FA9040";
  variant: "desi" | "uber";
}

export const ORDER_OPTIONS: OrderOption[] = [
  {
    id: "direct",
    brand: "Desi Dhamaka",
    title: "Order Direct",
    badge: "Pickup Only",
    description:
      "Order directly from us for the freshest experience and the best service.",
    image: "/showcase/biryani.jpg",
    imageAlt: "Fresh biryani from Desi Dhamaka",
    pills: ["Fresh Daily", "Best Value", "Personal Service"],
    buttonText: "Order Direct",
    buttonHref: ORDER_DIRECT_URL,
    buttonColor: "#ED3C18",
    variant: "desi",
  },
  {
    id: "uber",
    brand: "Uber Eats",
    title: "Delivery & Pickup",
    badge: "Available Now",
    description: "Enjoy fast delivery or pickup through Uber Eats.",
    image: "/showcase/tandoori.jpg",
    imageAlt: "Tandoori platter available on Uber Eats",
    pills: ["Fast Delivery", "Live Tracking", "Easy Pickup"],
    buttonText: "Order with Uber Eats",
    buttonHref: UBER_EATS_URL,
    buttonColor: "#FA9040",
    variant: "uber",
  },
];

export const ORDER_FEATURES = [
  {
    icon: "fresh" as const,
    title: "Fresh Preparation",
    description: "Every order prepared to order in our kitchen.",
  },
  {
    icon: "pricing" as const,
    title: "Better Pricing",
    description: "Save more when you order direct from us.",
  },
  {
    icon: "pickup" as const,
    title: "Quick Pickup",
    description: "Ready fast for convenient collection.",
  },
  {
    icon: "offers" as const,
    title: "Exclusive Offers",
    description: "Special deals for direct orders only.",
  },
];
