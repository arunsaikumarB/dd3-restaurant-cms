import type {
  ActivityItem,
  AdminStat,
  GalleryImage,
  HomepageSection,
  MenuItem,
  Offer,
  Review,
} from "../types";

export const DASHBOARD_STATS: AdminStat[] = [
  { id: "offers", label: "Active Offers", value: 3, change: "1 ending soon", trend: "neutral", icon: "tag" },
  { id: "gallery", label: "Gallery Images", value: 48, change: "+6 uploaded", trend: "up", icon: "image" },
  { id: "reviews", label: "Reviews", value: 127, change: "4 pending", trend: "neutral", icon: "star" },
  { id: "integrations", label: "ChefGaa Locations", value: 3, change: "Menu sync via integrations", trend: "neutral", icon: "users" },
  { id: "visitors", label: "Website Visitors", value: "2.4k", change: "+12% this month", trend: "up", icon: "users" },
];

export const VISITOR_CHART_DATA = [
  { label: "Mon", value: 320 },
  { label: "Tue", value: 410 },
  { label: "Wed", value: 380 },
  { label: "Thu", value: 520 },
  { label: "Fri", value: 680 },
  { label: "Sat", value: 890 },
  { label: "Sun", value: 720 },
];

export const CONTENT_CHART_DATA = [
  { label: "Jan", value: 12 },
  { label: "Feb", value: 18 },
  { label: "Mar", value: 15 },
  { label: "Apr", value: 22 },
  { label: "May", value: 19 },
  { label: "Jun", value: 24 },
];

export const RECENT_ACTIVITIES: ActivityItem[] = [
  { id: "1", action: "Offer activated", target: "Weekend Biryani Special", time: "18 min ago", type: "offer" },
  { id: "2", action: "Review submitted", target: "Michael R. — 5 stars", time: "1 hr ago", type: "review" },
  { id: "3", action: "Image uploaded", target: "Gallery — Tandoori Platter", time: "3 hrs ago", type: "gallery" },
  { id: "4", action: "Homepage updated", target: "Hero section refreshed", time: "5 hrs ago", type: "settings" },
  { id: "5", action: "ChefGaa integration viewed", target: "South Plainfield outlet 70", time: "Yesterday", type: "integration" },
  { id: "6", action: "Settings updated", target: "Opening hours changed", time: "Yesterday", type: "settings" },
];

export const MOCK_MENU_ITEMS: MenuItem[] = [
  { id: "1", name: "Chicken Dum Biryani", category: "Biryani", price: 16.99, image: "/showcase/biryani.webp", status: "active", vegType: "non-veg", popular: true, chefSpecial: true },
  { id: "2", name: "Mutton Mandi", category: "DD Special Mandi", price: 47.83, image: "/showcase/tandoori.webp", status: "active", vegType: "non-veg", popular: true, chefSpecial: true },
  { id: "3", name: "Butter Chicken", category: "North Indian", price: 16.99, image: "/showcase/biryani.webp", status: "active", vegType: "non-veg", popular: true, chefSpecial: false },
  { id: "4", name: "Tandoori Platter", category: "Kebab & Tandoori", price: 16.99, image: "/showcase/tandoori.webp", status: "active", vegType: "non-veg", popular: false, chefSpecial: true },
  { id: "5", name: "Paneer Tikka", category: "Appetizers", price: 12.99, image: "/showcase/biryani.webp", status: "active", vegType: "veg", popular: true, chefSpecial: false },
  { id: "6", name: "Garlic Naan", category: "Breads", price: 3.99, image: "/showcase/tandoori.webp", status: "active", vegType: "veg", popular: false, chefSpecial: false },
  { id: "7", name: "Mango Lassi", category: "Beverages", price: 4.99, image: "/showcase/biryani.webp", status: "inactive", vegType: "veg", popular: false, chefSpecial: false },
  { id: "8", name: "Lamb Seekh Kebab", category: "Kebab & Tandoori", price: 14.99, image: "/showcase/tandoori.webp", status: "draft", vegType: "non-veg", popular: false, chefSpecial: false },
];

export const MOCK_OFFERS: Offer[] = [
  { id: "1", name: "Weekend Biryani Special", discount: "15% OFF", banner: "/showcase/biryani.webp", startDate: "2026-06-01", endDate: "2026-06-30", status: "active" },
  { id: "2", name: "Family Feast Combo", discount: "$10 OFF", banner: "/showcase/tandoori.webp", startDate: "2026-06-15", endDate: "2026-07-15", status: "active" },
  { id: "3", name: "Lunch Express", discount: "20% OFF", banner: "/showcase/biryani.webp", startDate: "2026-05-01", endDate: "2026-05-31", status: "inactive" },
  { id: "4", name: "Grand Opening Promo", discount: "25% OFF", banner: "/showcase/tandoori.webp", startDate: "2026-07-01", endDate: "2026-07-31", status: "draft" },
];

export const MOCK_GALLERY: GalleryImage[] = [
  { id: "1", url: "/showcase/biryani.webp", category: "Food", title: "Chicken Dum Biryani" },
  { id: "2", url: "/showcase/tandoori.webp", category: "Food", title: "Tandoori Platter" },
  { id: "3", url: "/showcase/biryani.webp", category: "Ambiance", title: "Dining Room" },
  { id: "4", url: "/showcase/tandoori.webp", category: "Events", title: "Private Party Setup" },
  { id: "5", url: "/showcase/biryani.webp", category: "Food", title: "Mutton Mandi" },
  { id: "6", url: "/showcase/tandoori.webp", category: "Kitchen", title: "Tandoor Station" },
  { id: "7", url: "/showcase/biryani.webp", category: "Food", title: "Butter Chicken" },
  { id: "8", url: "/showcase/tandoori.webp", category: "Ambiance", title: "Bar Area" },
];

export const MOCK_REVIEWS: Review[] = [
  { id: "1", customer: "Michael R.", rating: 5, review: "Best biryani in Lawrenceville! The flavors are authentic and the service is exceptional.", date: "2026-06-28", status: "approved" },
  { id: "2", customer: "Lisa M.", rating: 4, review: "Great tandoori platter. Portion sizes are generous. Will definitely come back.", date: "2026-06-27", status: "approved" },
  { id: "3", customer: "Raj K.", rating: 5, review: "Mutton mandi was outstanding. Reminded me of home.", date: "2026-06-27", status: "pending" },
  { id: "4", customer: "Tom H.", rating: 3, review: "Food was good but wait time was longer than expected on a Friday night.", date: "2026-06-26", status: "pending" },
  { id: "5", customer: "Nina S.", rating: 5, review: "Perfect for family dinners. Kids loved the butter chicken!", date: "2026-06-25", status: "approved" },
  { id: "6", customer: "Chris B.", rating: 2, review: "Order was missing naan. Otherwise taste was fine.", date: "2026-06-24", status: "rejected" },
];

export const HOMEPAGE_SECTIONS: HomepageSection[] = [
  {
    id: "hero",
    label: "Hero Banner",
    description: "Main homepage hero with video background and headline.",
    fields: [
      { key: "title", label: "Hero Title", value: "Authentic Indian Cuisine", type: "text" },
      { key: "subtitle", label: "Hero Subtitle", value: "Experience the rich flavors of India in Lawrenceville, NJ", type: "textarea" },
    ],
  },
  {
    id: "featured",
    label: "About — Heading & Lead",
    description: "Title and lead paragraph for the homepage About / Our Story section.",
    fields: [
      { key: "heading", label: "Section Heading", value: "Authentic Flavours, Warm Hospitality", type: "text" },
      { key: "subheading", label: "Lead Paragraph", value: "Experience authentic Indian cuisine crafted with passion and served with genuine hospitality.", type: "textarea" },
    ],
  },
];

export const RESTAURANT_SETTINGS = {
  name: "Desi Dhamaka",
  address: "540 Lawrence Square Blvd S, Lawrenceville, NJ 08648",
  phone: "(609) 890-9272",
  email: "desidhamaka3marketing@gmail.com",
  hours: {
    weekday: "11:00 AM – 10:00 PM",
    weekend: "11:00 AM – 11:00 PM",
    sunday: "12:00 PM – 9:30 PM",
  },
  social: {
    instagram: "https://www.instagram.com/",
    facebook: "https://www.facebook.com/",
    google: "https://www.google.com/maps/",
  },
  maps: "https://maps.google.com/maps?q=Desi+Dhamaka+Lawrenceville+NJ",
  seo: {
    title: "Desi Dhamaka | Authentic Indian Restaurant in Lawrenceville, NJ",
    description: "Order authentic Indian food online from Desi Dhamaka. Biryani, tandoori, mandi & more.",
    keywords: "indian restaurant, biryani, lawrenceville, nj, desi dhamaka",
  },
};

export const ADMIN_PROFILE = {
  name: "Admin User",
  email: "admin@desidhamaka.com",
  role: "Restaurant Manager",
  avatar: "",
  joined: "January 2024",
};
