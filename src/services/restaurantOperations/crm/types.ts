export type CustomerStatus = "active" | "inactive" | "vip" | "blacklisted" | "duplicate";

export type LoyaltyTier = "silver" | "gold" | "platinum";

export type CrmCustomer = {
  id: string;
  locationId: string | null;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  phone: string | null;
  email: string | null;
  dateOfBirth: string | null;
  anniversary: string | null;
  gender: string | null;
  preferredLanguage: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  timezone: string | null;
  profilePhotoUrl: string | null;
  status: CustomerStatus;
  isVip: boolean;
  visitCount: number;
  lastVisit: string | null;
  lifetimeValue: number;
  avgPartySize: number | null;
  avgSpend: number | null;
  marketingConsent: boolean;
  aiPersonalizationConsent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CrmPreference = {
  key: string;
  value: string | null;
  confidence: number;
  source: string;
};

export type CrmMemoryItem = {
  key: string;
  value: Record<string, unknown>;
  confidence: number;
  source: string;
};

export type CrmLoyalty = {
  points: number;
  tier: LoyaltyTier;
  rewards: unknown[];
  coupons: unknown[];
  benefits: unknown[];
  referralPoints: number;
};

export type CrmVisit = {
  id: string;
  customerId: string;
  locationId: string | null;
  reservationId: string | null;
  visitType: string;
  visitDate: string | null;
  visitTime: string | null;
  partySize: number | null;
  spend: number | null;
  occasion: string | null;
  status: string;
};

export type CrmTimelineEvent = {
  id: string;
  customerId: string;
  eventType: string;
  title: string | null;
  summary: string | null;
  payload: Record<string, unknown>;
  occurredAt: string;
};

export type CrmInsight = {
  id: string;
  customerId: string | null;
  insightType: string;
  title: string;
  reason: string | null;
  priority: string;
  status: string;
};

export type CrmCommunication = {
  id: string;
  customerId: string | null;
  channel: string;
  direction: string;
  subject: string | null;
  body: string | null;
  summary: string | null;
  conversationId: string | null;
  createdAt: string;
};

export type CrmContextPackage = {
  customerId: string | null;
  returning: boolean;
  displayName: string | null;
  status: string | null;
  isVip: boolean;
  loyalty: CrmLoyalty | null;
  preferences: Record<string, string>;
  memory: Record<string, unknown>;
  segments: string[];
  knownFields: string[];
  birthdaySoon: boolean;
  anniversarySoon: boolean;
  personalizationAllowed: boolean;
  summary: string;
};

export type CrmDashboard = {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  vipCount: number;
  birthdaysToday: number;
  anniversariesToday: number;
  inactiveCustomers: number;
  averageVisits: number;
  averageLifetimeValue: number;
  loyaltyDistribution: Array<{ label: string; value: number }>;
  segmentCounts: Array<{ label: string; value: number }>;
  topCustomers: Array<{ id: string; name: string; visits: number; ltv: number }>;
};
