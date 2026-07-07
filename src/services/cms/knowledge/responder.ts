import { detectIntent } from "../../ai/emotionEngine";
import { listCMSLocations } from "./builder";
import { getSeoPage } from "./builder";
import { queryCMSKnowledge } from "./query";
import type { CMSKnowledge } from "./types";
import {
  formatModuleCapabilities,
  unavailableForModule,
  unavailableGeneric,
  unavailableMenu,
} from "./unavailable";

function lines(items: string[]): string {
  return items.filter(Boolean).join("\n");
}

function button(label: string, path: string): string {
  return `[BUTTON:${label}|${path}]`;
}

function formatHours(knowledge: CMSKnowledge): string {
  const settings = knowledge.modules.restaurantSettings.data;
  const location = knowledge.modules.locationSettings.data;
  const hours = settings?.hours?.length ? settings.hours : location?.openingHours;

  if (!hours?.length) {
    return unavailableForModule(knowledge, "opening hours");
  }

  const list = hours.map((row) => `• **${row.days}**: ${row.time}`).join("\n");
  const name = settings?.name || knowledge.locationName;
  return `Here are the opening hours for **${name}** at **${knowledge.locationName}**:\n\n${list}`;
}

function formatOffers(knowledge: CMSKnowledge): string {
  const offers = knowledge.modules.offers.data;
  if (!offers?.length) {
    return `${unavailableForModule(knowledge, "offers")}\n\n${button("View Offers", knowledge.navigation.offers)}`;
  }

  const list = offers
    .slice(0, 6)
    .map((offer) => {
      const badge = offer.badge ? ` (${offer.badge})` : "";
      const desc = offer.description ? `\n${offer.description}` : "";
      return `🎁 **${offer.title}**${badge}${desc}`;
    })
    .join("\n\n");

  return `Here are the current offers at **${knowledge.locationName}**:\n\n${list}\n\n${button("View All Offers", knowledge.navigation.offers)}`;
}

function formatContact(knowledge: CMSKnowledge): string {
  const restaurant = knowledge.modules.restaurantSettings.data;
  const location = knowledge.modules.locationSettings.data;

  if (!restaurant && !location) {
    return unavailableForModule(knowledge, "contact");
  }

  const parts: string[] = [];
  const name = restaurant?.name || location?.name;
  if (name) parts.push(`**${name}** — ${knowledge.locationName}`);

  const address = restaurant?.address || location?.address;
  if (address) parts.push(`📍 ${address}`);

  const phones = restaurant?.phones?.length ? restaurant.phones : location?.phone ? [location.phone] : [];
  if (phones.length) parts.push(`☎ ${phones.join(" · ")}`);

  if (restaurant?.email || location?.email) {
    parts.push(`✉ ${restaurant?.email || location?.email}`);
  }

  const social = restaurant?.social;
  const socials: string[] = [];
  if (social?.instagram) socials.push(`Instagram: ${social.instagram}`);
  if (social?.facebook) socials.push(`Facebook: ${social.facebook}`);
  if (social?.youtube) socials.push(`YouTube: ${social.youtube}`);
  if (socials.length) parts.push(socials.join("\n"));

  return `${lines(parts)}\n\n${button("Contact Page", knowledge.navigation.contact)}`;
}

function formatGallery(knowledge: CMSKnowledge): string {
  const gallery = knowledge.modules.gallery.data;
  if (!gallery?.length) {
    return `${unavailableForModule(knowledge, "gallery")}\n\n${button("View Gallery", knowledge.navigation.gallery)}`;
  }

  const featured = gallery.filter((item) => item.featured).slice(0, 4);
  const picks = (featured.length ? featured : gallery).slice(0, 6);
  const list = picks
    .map((item) => {
      const cat = item.category ? ` — *${item.category}*` : "";
      const cap = item.caption ? `\n${item.caption}` : "";
      return `📷 **${item.title || "Gallery image"}**${cat}${cap}`;
    })
    .join("\n\n");

  return `From our gallery at **${knowledge.locationName}**:\n\n${list}\n\n${button("View Gallery", knowledge.navigation.gallery)}`;
}

function formatReviews(knowledge: CMSKnowledge): string {
  const reviews = knowledge.modules.reviews.data;
  if (!reviews?.length) {
    return `${unavailableForModule(knowledge, "reviews")}\n\n${button("Testimonials", knowledge.navigation.testimonials)}`;
  }

  const list = reviews
    .slice(0, 4)
    .map((review) => `⭐ **${review.rating}/5** — ${review.name}\n"${review.excerpt}"`)
    .join("\n\n");

  return `What guests are saying about **${knowledge.locationName}**:\n\n${list}\n\n${button("Read Testimonials", knowledge.navigation.testimonials)}`;
}

function formatGreeting(knowledge: CMSKnowledge): string {
  const homepage = knowledge.modules.homepage.data;
  const seoHome = getSeoPage(knowledge, "homepage");

  if (homepage?.heroSubtitle) {
    return `Namaste! Welcome to **${knowledge.locationName}**.\n\n${homepage.heroSubtitle}`;
  }
  if (seoHome?.description) {
    return `Namaste! Welcome to **${knowledge.locationName}**.\n\n${seoHome.description}`;
  }
  if (homepage?.aboutDescription) {
    return `Namaste! Welcome to **${knowledge.locationName}**.\n\n${homepage.aboutDescription}`;
  }

  return `Namaste! I'm Cheffy at **${knowledge.locationName}**. How can I help you today?`;
}

function formatOrder(knowledge: CMSKnowledge): string {
  const restaurant = knowledge.modules.restaurantSettings.data;
  const location = knowledge.modules.locationSettings.data;
  const orderUrl = restaurant?.orderUrl || location?.orderDirectLink;

  if (!orderUrl) {
    return unavailableForModule(knowledge, "online ordering");
  }

  return `You can order from **${knowledge.locationName}** here:\n\n${button("Order Online", orderUrl)}`;
}

function formatReservation(knowledge: CMSKnowledge): string {
  const restaurant = knowledge.modules.restaurantSettings.data;
  const seoReservation = getSeoPage(knowledge, "reservation");
  const reservationUrl = restaurant?.reservationUrl || knowledge.navigation.reservation;

  const parts: string[] = [`Reservations at **${knowledge.locationName}**:`];

  if (seoReservation?.description) {
    parts.push(seoReservation.description);
  } else if (knowledge.modules.homepage.data?.aboutDescription) {
    parts.push(knowledge.modules.homepage.data.aboutDescription);
  }

  if (reservationUrl) {
    parts.push(button("Reserve a Table", reservationUrl));
  } else {
    parts.push(unavailableForModule(knowledge, "reservation link"));
  }

  return lines(parts);
}

function formatCateringOrParty(knowledge: CMSKnowledge, intent: "catering" | "party"): string {
  const seoKey = intent === "party" ? "events" : "catering";
  const seoPage = getSeoPage(knowledge, seoKey) ?? getSeoPage(knowledge, "private-dining");
  const homepage = knowledge.modules.homepage.data;
  const navPath = intent === "party" ? knowledge.navigation.parties : knowledge.navigation.catering;

  const parts: string[] = [];

  if (seoPage?.description) {
    parts.push(seoPage.description);
  } else if (homepage?.aboutDescription) {
    parts.push(homepage.aboutDescription);
  }

  if (!parts.length) {
    return `${unavailableForModule(knowledge, intent === "party" ? "party & events" : "catering")}\n\n${button(intent === "party" ? "Party Hall" : "Catering", navPath)}`;
  }

  parts.push(button(intent === "party" ? "Party Hall" : "Catering", navPath));
  return lines(parts);
}

function formatLocations(knowledge: CMSKnowledge, message: string): string {
  const q = message.toLowerCase();
  const all = listCMSLocations();

  const match = all.find((loc) => {
    const id = loc.id.replace(/-/g, " ");
    return q.includes(loc.shortName.toLowerCase()) || q.includes(id);
  });

  if (match) {
    return `**${match.name}**\n📍 ${match.address}\n☎ ${match.phone}\n✉ ${match.email}`;
  }

  const list = all
    .map((loc) => `• **${loc.name}** — ${loc.address}`)
    .join("\n");

  return `We serve guests at these locations:\n\n${list}\n\nYou're currently viewing **${knowledge.locationName}**.`;
}

function formatSeoBuffet(knowledge: CMSKnowledge): string {
  const menuSeo = getSeoPage(knowledge, "menu");
  const hours = formatHours(knowledge);

  if (menuSeo?.description) {
    return `${menuSeo.description}\n\n${hours}`;
  }

  return hours;
}

/**
 * Builds a reply using only CMS module data — no hardcoded business answers.
 */
export function resolveCMSReply(message: string, knowledge: CMSKnowledge): string {
  const intent = detectIntent(message);
  queryCMSKnowledge(intent, knowledge);

  switch (intent) {
    case "hours":
      return formatHours(knowledge);
    case "offers":
      return formatOffers(knowledge);
    case "contact":
      return formatContact(knowledge);
    case "order":
      return formatOrder(knowledge);
    case "reservation":
      return formatReservation(knowledge);
    case "catering":
      return formatCateringOrParty(knowledge, "catering");
    case "party":
      return formatCateringOrParty(knowledge, "party");
    case "location":
      return formatLocations(knowledge, message);
    case "greeting":
      return formatGreeting(knowledge);
    case "faq":
      return formatModuleCapabilities(knowledge);
    case "buffet":
      return formatSeoBuffet(knowledge);
    case "gallery":
      return formatGallery(knowledge);
    case "menu":
    case "vegetarian":
    case "recommend":
    case "kids":
      return unavailableMenu(knowledge);
    default: {
      const offers = knowledge.modules.offers.data;
      const reviews = knowledge.modules.reviews.data;
      if (offers?.length) return formatOffers(knowledge);
      if (reviews?.length) return formatReviews(knowledge);
      return unavailableGeneric(knowledge);
    }
  }
}

export function resolveCMSReplyWhenLoading(): string {
  return "I'm still loading the latest information from our website. Please try again in a moment.";
}

export function resolveCMSReplyWhenUnavailable(): string {
  return "I'm having trouble loading restaurant information right now. Please try again shortly.";
}
