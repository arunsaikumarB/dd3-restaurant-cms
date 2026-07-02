export const SITE = {
  name: "Desi Dhamaka",
  tagline: "Indian Restaurant",
  phone: "(609) 890-9272",
  email: "desidhamaka3marketing@gmail.com",
  address: "540 Lawrence Square Blvd S, Lawrenceville, NJ 08648",
  city: "Lawrenceville",
  state: "NJ",
  postalCode: "08648",
  country: "US",
  geo: {
    latitude: 40.2912,
    longitude: -74.7265,
  },
  hours: [
    { days: "Mon – Thu", time: "11:00 AM – 10:00 PM" },
    { days: "Fri – Sat", time: "11:00 AM – 11:00 PM" },
    { days: "Sunday", time: "12:00 PM – 9:30 PM" },
  ],
  mapEmbed:
    "https://maps.google.com/maps?q=Desi+Dhamaka+540+Lawrence+Square+Blvd+S+Lawrenceville+NJ+08648&t=&z=15&ie=UTF8&iwloc=&output=embed",
  mapDirections:
    "https://www.google.com/maps/dir/?api=1&destination=540+Lawrence+Square+Blvd+S,+Lawrenceville,+NJ+08648",
  social: {
    instagram: "https://www.instagram.com/",
    facebook: "https://www.facebook.com/",
    google:
      "https://www.google.com/maps/search/?api=1&query=Desi+Dhamaka+540+Lawrence+Square+Blvd+S+Lawrenceville+NJ",
  },
  /** Default OG image — restaurant showcase photo. */
  ogImage: "/showcase/biryani.webp",
} as const;

export const SOCIAL_LABELS: Record<keyof typeof SITE.social, string> = {
  instagram: "Desi Dhamaka on Instagram",
  facebook: "Desi Dhamaka on Facebook",
  google: "Desi Dhamaka on Google Maps",
};
