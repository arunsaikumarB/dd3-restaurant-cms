/**
 * Smoke tests for Cheffy smart tool calling (run: npx tsx scripts/verify-cheffy-tools.ts)
 */
import type { CMSKnowledge } from "../src/services/cms/knowledge/types";
import { executeConciergeTools, resolveToolPlan } from "../src/services/ai/tools";
import { clearToolCache } from "../src/services/ai/tools/toolCache";

function mockKnowledge(locationId: "south-plainfield" | "oak-tree" | "lawrenceville"): CMSKnowledge {
  const names = {
    "south-plainfield": "South Plainfield",
    "oak-tree": "Oak Tree",
    lawrenceville: "Lawrenceville",
  };

  return {
    locationId,
    locationName: names[locationId],
    generatedAt: new Date().toISOString(),
    navigation: {
      home: `/${locationId}`,
      menu: `/${locationId}/menu`,
      offers: `/${locationId}/special-offers`,
      gallery: `/${locationId}/gallery`,
      contact: `/${locationId}/contact`,
      order: `/${locationId}/online-ordering`,
      catering: `/${locationId}/catering`,
      reservation: `/${locationId}/reservation`,
    },
    modules: {
      restaurantSettings: {
        key: "restaurantSettings",
        available: true,
        data: {
          name: `Desi Dhamaka ${names[locationId]}`,
          phone: "555-0100",
          phones: ["555-0100"],
          email: "info@example.com",
          address: `123 Main St, ${names[locationId]}`,
          hours: [{ days: "Mon-Sun", time: "11am - 10pm" }],
          orderUrl: `https://order.example/${locationId}`,
          reservationUrl: `https://reserve.example/${locationId}`,
          googleMaps: "https://maps.example",
          social: { instagram: "https://instagram.example" },
        },
      },
      homepage: {
        key: "homepage",
        available: true,
        data: {
          heroTitle: "Welcome",
          heroSubtitle: "Authentic flavors",
          aboutTitle: "Our Story",
          aboutDescription: "Family-owned Indian restaurant.",
          primaryCta: { label: "Order", url: "/order" },
          secondaryCta: { label: "Reserve", url: "/reserve" },
        },
      },
      offers: {
        key: "offers",
        available: true,
        data: [{ title: "Lunch Special", description: "Weekdays only", slug: "lunch", badge: "Hot" }],
      },
      gallery: {
        key: "gallery",
        available: true,
        data: [{ title: "Dining Room", caption: "Warm ambiance", category: "Interior", featured: true }],
      },
      reviews: {
        key: "reviews",
        available: true,
        data: [{ name: "Alex", rating: 5, excerpt: "Amazing biryani!" }],
      },
      seo: {
        key: "seo",
        available: true,
        data: [{ pageKey: "home", title: "Home", description: "Best Indian food", keywords: "indian, biryani" }],
      },
      locationSettings: {
        key: "locationSettings",
        available: true,
        data: {
          id: locationId,
          name: names[locationId],
          shortName: names[locationId],
          address: `123 Main St, ${names[locationId]}`,
          phone: "555-0100",
          email: "info@example.com",
          reservationLink: "https://reserve.example",
          orderDirectLink: "https://order.example",
          openingHours: [{ days: "Mon-Sun", time: "11am - 10pm" }],
        },
      },
    },
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

clearToolCache();

const multiPlan = resolveToolPlan("What offers do you have and where are you located?");
assert(multiPlan.tools.includes("getOffers"), "multi-intent should include getOffers");
assert(multiPlan.tools.includes("getRestaurantInfo"), "multi-intent should include getRestaurantInfo");
assert(multiPlan.tools.includes("getCurrentLocation"), "multi-intent should include getCurrentLocation");

const sp = mockKnowledge("south-plainfield");
const oak = mockKnowledge("oak-tree");
const multiResults = executeConciergeTools(
  "What offers do you have and where are you located?",
  sp,
  undefined,
  "test-conv-1",
);
assert(multiResults.length >= 3, "multi-tool execution should run multiple tools");
assert(multiResults.every((r) => r.available), "all tools should succeed with mock data");

const spLocation = executeConciergeTools("where are you", sp)[0];
const oakLocation = executeConciergeTools("where are you", oak)[0];
assert(
  (spLocation.data as { locationId: string }).locationId === "south-plainfield",
  "SP location isolation",
);
assert(
  (oakLocation.data as { locationId: string }).locationId === "oak-tree",
  "Oak Tree location isolation",
);

executeConciergeTools("what time do you close", sp);
const cached = executeConciergeTools("what time do you close", sp);
assert(
  cached.some((r) => r.tool === "getRestaurantInfo" && r.available),
  "hours query should fetch restaurant info",
);

const nav = executeConciergeTools("take me to catering", sp);
assert(nav.some((r) => r.tool === "navigateToPage"), "navigation intent should call navigateToPage");

console.log("verify-cheffy-tools: all checks passed");
