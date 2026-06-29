import type {
  ActivityItem,
  AdminStat,
  Category,
  GalleryImage,
  HomepageSection,
  MenuItem,
  Offer,
  Reservation,
  Review,
} from "../types";

export const DASHBOARD_STATS: AdminStat[] = [
  { id: "menu", label: "Total Menu Items", value: 86, change: "+4 this week", trend: "up", icon: "utensils" },
  { id: "offers", label: "Active Offers", value: 3, change: "1 ending soon", trend: "neutral", icon: "tag" },
  { id: "reservations", label: "Reservations Today", value: 12, change: "+3 vs yesterday", trend: "up", icon: "calendar" },
  { id: "gallery", label: "Gallery Images", value: 48, change: "+6 uploaded", trend: "up", icon: "image" },
  { id: "reviews", label: "Reviews", value: 127, change: "4 pending", trend: "neutral", icon: "star" },
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

export const RESERVATION_CHART_DATA = [
  { label: "Jan", value: 45 },
  { label: "Feb", value: 52 },
  { label: "Mar", value: 61 },
  { label: "Apr", value: 58 },
  { label: "May", value: 72 },
  { label: "Jun", value: 68 },
];

export const RECENT_ACTIVITIES: ActivityItem[] = [
  { id: "1", action: "New reservation", target: "Priya Sharma — 4 guests", time: "2 min ago", type: "reservation" },
  { id: "2", action: "Menu item updated", target: "Chicken Dum Biryani", time: "18 min ago", type: "menu" },
  { id: "3", action: "Review submitted", target: "Michael R. — 5 stars", time: "1 hr ago", type: "review" },
  { id: "4", action: "Offer activated", target: "Weekend Biryani Special", time: "3 hrs ago", type: "offer" },
  { id: "5", action: "Image uploaded", target: "Gallery — Tandoori Platter", time: "5 hrs ago", type: "gallery" },
  { id: "6", action: "Settings updated", target: "Opening hours changed", time: "Yesterday", type: "settings" },
];

export const MOCK_MENU_ITEMS: MenuItem[] = [
  { id: "1", name: "Chicken Dum Biryani", category: "Biryani", price: 16.99, image: "/showcase/biryani.jpg", status: "active", vegType: "non-veg", popular: true, chefSpecial: true },
  { id: "2", name: "Mutton Mandi", category: "DD Special Mandi", price: 47.83, image: "/showcase/tandoori.jpg", status: "active", vegType: "non-veg", popular: true, chefSpecial: true },
  { id: "3", name: "Butter Chicken", category: "North Indian", price: 16.99, image: "/showcase/biryani.jpg", status: "active", vegType: "non-veg", popular: true, chefSpecial: false },
  { id: "4", name: "Tandoori Platter", category: "Kebab & Tandoori", price: 16.99, image: "/showcase/tandoori.jpg", status: "active", vegType: "non-veg", popular: false, chefSpecial: true },
  { id: "5", name: "Paneer Tikka", category: "Appetizers", price: 12.99, image: "/showcase/biryani.jpg", status: "active", vegType: "veg", popular: true, chefSpecial: false },
  { id: "6", name: "Garlic Naan", category: "Breads", price: 3.99, image: "/showcase/tandoori.jpg", status: "active", vegType: "veg", popular: false, chefSpecial: false },
  { id: "7", name: "Mango Lassi", category: "Beverages", price: 4.99, image: "/showcase/biryani.jpg", status: "inactive", vegType: "veg", popular: false, chefSpecial: false },
  { id: "8", name: "Lamb Seekh Kebab", category: "Kebab & Tandoori", price: 14.99, image: "/showcase/tandoori.jpg", status: "draft", vegType: "non-veg", popular: false, chefSpecial: false },
];

export const MOCK_CATEGORIES: Category[] = [
  { id: "1", name: "Biryani", image: "/showcase/biryani.jpg", itemCount: 12 },
  { id: "2", name: "North Indian", image: "/showcase/tandoori.jpg", itemCount: 18 },
  { id: "3", name: "Kebab & Tandoori", image: "/showcase/tandoori.jpg", itemCount: 14 },
  { id: "4", name: "DD Special Mandi", image: "/showcase/biryani.jpg", itemCount: 6 },
  { id: "5", name: "Appetizers", image: "/showcase/tandoori.jpg", itemCount: 10 },
  { id: "6", name: "Breads", image: "/showcase/biryani.jpg", itemCount: 8 },
  { id: "7", name: "Beverages", image: "/showcase/tandoori.jpg", itemCount: 9 },
  { id: "8", name: "Desserts", image: "/showcase/biryani.jpg", itemCount: 7 },
];

export const MOCK_OFFERS: Offer[] = [
  { id: "1", name: "Weekend Biryani Special", discount: "15% OFF", banner: "/showcase/biryani.jpg", startDate: "2026-06-01", endDate: "2026-06-30", status: "active" },
  { id: "2", name: "Family Feast Combo", discount: "$10 OFF", banner: "/showcase/tandoori.jpg", startDate: "2026-06-15", endDate: "2026-07-15", status: "active" },
  { id: "3", name: "Lunch Express", discount: "20% OFF", banner: "/showcase/biryani.jpg", startDate: "2026-05-01", endDate: "2026-05-31", status: "inactive" },
  { id: "4", name: "Grand Opening Promo", discount: "25% OFF", banner: "/showcase/tandoori.jpg", startDate: "2026-07-01", endDate: "2026-07-31", status: "draft" },
];

export const MOCK_GALLERY: GalleryImage[] = [
  { id: "1", url: "/showcase/biryani.jpg", category: "Food", title: "Chicken Dum Biryani" },
  { id: "2", url: "/showcase/tandoori.jpg", category: "Food", title: "Tandoori Platter" },
  { id: "3", url: "/showcase/biryani.jpg", category: "Ambiance", title: "Dining Room" },
  { id: "4", url: "/showcase/tandoori.jpg", category: "Events", title: "Private Party Setup" },
  { id: "5", url: "/showcase/biryani.jpg", category: "Food", title: "Mutton Mandi" },
  { id: "6", url: "/showcase/tandoori.jpg", category: "Kitchen", title: "Tandoor Station" },
  { id: "7", url: "/showcase/biryani.jpg", category: "Food", title: "Butter Chicken" },
  { id: "8", url: "/showcase/tandoori.jpg", category: "Ambiance", title: "Bar Area" },
];

export const MOCK_RESERVATIONS: Reservation[] = [
  { id: "1", name: "Priya Sharma", date: "2026-06-30", time: "7:00 PM", guests: 4, phone: "(609) 555-0142", notes: "Birthday celebration", status: "confirmed" },
  { id: "2", name: "James Wilson", date: "2026-06-30", time: "6:30 PM", guests: 2, phone: "(609) 555-0198", notes: "Window seat preferred", status: "pending" },
  { id: "3", name: "Anita Patel", date: "2026-06-30", time: "8:00 PM", guests: 6, phone: "(609) 555-0234", notes: "Vegetarian options needed", status: "confirmed" },
  { id: "4", name: "Robert Chen", date: "2026-07-01", time: "12:30 PM", guests: 3, phone: "(609) 555-0267", notes: "", status: "pending" },
  { id: "5", name: "Sarah Johnson", date: "2026-07-01", time: "7:30 PM", guests: 8, phone: "(609) 555-0312", notes: "Corporate dinner", status: "confirmed" },
  { id: "6", name: "David Kumar", date: "2026-06-29", time: "6:00 PM", guests: 2, phone: "(609) 555-0389", notes: "", status: "completed" },
  { id: "7", name: "Emily Davis", date: "2026-06-28", time: "8:30 PM", guests: 4, phone: "(609) 555-0412", notes: "Cancelled due to weather", status: "cancelled" },
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
      { key: "cta1", label: "Primary CTA", value: "Order Now", type: "text" },
      { key: "cta2", label: "Secondary CTA", value: "Reserve a Table", type: "text" },
    ],
  },
  {
    id: "featured",
    label: "Featured Dishes",
    description: "Signature dishes showcased on the homepage carousel.",
    fields: [
      { key: "heading", label: "Section Heading", value: "Signature Special Dishes", type: "text" },
      { key: "subheading", label: "Section Subheading", value: "Discover our chef's most celebrated creations", type: "textarea" },
    ],
  },
  {
    id: "testimonials",
    label: "Testimonials",
    description: "Customer reviews displayed on the homepage.",
    fields: [
      { key: "heading", label: "Section Heading", value: "What Our Guests Say", type: "text" },
      { key: "count", label: "Reviews to Show", value: "3", type: "text" },
    ],
  },
  {
    id: "gallery",
    label: "Gallery Preview",
    description: "Preview images linking to the full gallery.",
    fields: [
      { key: "heading", label: "Section Heading", value: "A Taste of Desi Dhamaka", type: "text" },
      { key: "count", label: "Images to Show", value: "6", type: "text" },
    ],
  },
  {
    id: "footer",
    label: "Footer Content",
    description: "Footer tagline and contact summary.",
    fields: [
      { key: "tagline", label: "Footer Tagline", value: "Where every meal is a celebration", type: "text" },
      { key: "hours", label: "Hours Summary", value: "Open Daily — 11 AM to 10 PM", type: "text" },
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
