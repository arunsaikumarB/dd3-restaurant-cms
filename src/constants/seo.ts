export interface PageSeoConfig {
  title: string;
  description: string;
  /** Path without domain, e.g. `/menu` */
  path: string;
  image?: string;
}

export const PAGE_SEO: Record<string, PageSeoConfig> = {
  "/": {
    title: "Desi Dhamaka — Authentic Indian Restaurant in Lawrenceville, NJ",
    description:
      "Experience authentic Andhra and Hyderabadi cuisine at Desi Dhamaka in Lawrenceville, NJ. Dum biryanis, mandi, tandoori, catering, private parties and luxury dining.",
    path: "/",
  },
  "/about": {
    title: "About Us — Desi Dhamaka Indian Restaurant",
    description:
      "Discover the story behind Desi Dhamaka — tradition, passion and authentic Indian hospitality in Lawrence Township, New Jersey.",
    path: "/about",
  },
  "/menu": {
    title: "Menu — Desi Dhamaka Indian Restaurant",
    description:
      "Browse our full menu of signature biryanis, mandi, tandoori, curries, Indo-Chinese favourites and more at Desi Dhamaka Lawrenceville.",
    path: "/menu",
  },
  "/catering": {
    title: "Catering — Desi Dhamaka Indian Restaurant",
    description:
      "Authentic Indian catering for weddings, corporate events and celebrations. Custom menus and exceptional service from Desi Dhamaka.",
    path: "/catering",
  },
  "/parties": {
    title: "Private Parties — Desi Dhamaka Indian Restaurant",
    description:
      "Host birthdays, anniversaries and group celebrations at Desi Dhamaka. Private dining spaces and bespoke menus in Lawrenceville, NJ.",
    path: "/parties",
  },
  "/testimonials": {
    title: "Testimonials — Desi Dhamaka Indian Restaurant",
    description:
      "Read what guests say about dining at Desi Dhamaka — authentic flavours, warm hospitality and unforgettable experiences.",
    path: "/testimonials",
  },
  "/contact": {
    title: "Contact — Desi Dhamaka Indian Restaurant",
    description:
      "Contact Desi Dhamaka for reservations, catering enquiries and private events. Call, email or visit us in Lawrenceville, NJ.",
    path: "/contact",
  },
  "/order": {
    title: "Order Online — Desi Dhamaka Indian Restaurant",
    description:
      "Order authentic Indian food from Desi Dhamaka. Pickup direct or delivery via Uber Eats — freshly prepared in Lawrenceville, NJ.",
    path: "/order",
  },
  "/gallery": {
    title: "Gallery — Desi Dhamaka Indian Restaurant",
    description:
      "Explore the elegant interiors, dining spaces and atmosphere of Desi Dhamaka in Lawrenceville, New Jersey.",
    path: "/gallery",
  },
  "/offers": {
    title: "Special Offers — Desi Dhamaka Indian Restaurant",
    description:
      "View current promotions and limited-time deals at Desi Dhamaka in Lawrenceville, New Jersey.",
    path: "/offers",
  },
  "/reservation": {
    title: "Reserve a Table — Desi Dhamaka Indian Restaurant",
    description:
      "Book your table at Desi Dhamaka Lawrenceville. Reserve online for an unforgettable authentic Indian dining experience.",
    path: "/reservation",
  },
  "/404": {
    title: "Page Not Found — Desi Dhamaka",
    description: "The page you are looking for could not be found.",
    path: "/404",
  },
};
