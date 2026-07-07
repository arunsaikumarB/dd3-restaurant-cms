/** Session-only guest profile — never persisted beyond the browser tab. */
export type DietaryPreference = "vegetarian" | "non-vegetarian" | "vegan";

export type SpicePreference = "mild" | "medium" | "spicy";

export type OrderPreference = "delivery" | "pickup" | "dine-in";

export type DiningPurpose =
  | "birthday"
  | "anniversary"
  | "office-lunch"
  | "catering"
  | "celebration"
  | "family"
  | "date"
  | "casual";

export type GuestMood =
  | "hungry"
  | "celebrating"
  | "in-a-hurry"
  | "grateful"
  | "browsing"
  | "curious"
  | "neutral";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "late-night";

export type GuestSessionProfile = {
  dietary?: DietaryPreference;
  spiceLevel?: SpicePreference;
  budget?: string;
  familySize?: number;
  favoriteDish?: string;
  diningPurpose?: DiningPurpose;
  orderPreference?: OrderPreference;
  cateringInterest?: boolean;
  guestMood?: GuestMood;
  lastTopic?: string;
  userMessageCount?: number;
  hasKids?: boolean;
};

export type RecommendationContext = {
  dietary?: DietaryPreference;
  spiceLevel?: SpicePreference;
  budget?: string;
  familySize?: number;
  diningPurpose?: DiningPurpose;
  mealTime?: TimeOfDay;
  locationName?: string;
  hasOffers?: boolean;
};
